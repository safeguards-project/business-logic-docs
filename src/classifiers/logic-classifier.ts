import { execute } from '@sourcegraph/amp-sdk'
import type { ExtractedFunction } from '../extractors/python-extractor.js'
import type { ExtractedSQLBlock } from '../extractors/sql-extractor.js'

async function executePrompt(prompt: string): Promise<string> {
  let result = ''
  for await (const message of execute({ prompt })) {
    if (message.type === 'result') {
      if (message.is_error) {
        throw new Error(message.error)
      }
      result = message.result
      break
    }
  }
  return result
}

export type Classification = 'business_logic' | 'pipeline_code'

export interface ClassificationResult {
  classification: Classification
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface ClassifiedFunction extends ExtractedFunction {
  classificationResult: ClassificationResult
}

export interface ClassifiedSQLBlock extends ExtractedSQLBlock {
  classificationResult: ClassificationResult
}

const BUSINESS_LOGIC_PATTERNS = [
  /threshold/i,
  /limit/i,
  /calculate.*(?:rag|status|score)/i,
  /validate/i,
  /check.*(?:rule|condition|constraint)/i,
  /(?:red|amber|green)/i,
  /percentage/i,
  /rate.*(?:increase|decrease)/i,
  /rule/i,
  /policy/i,
  /eligibility/i,
  /compliance/i,
  /sla/i,
  /kpi/i,
  /metric/i
]

const PIPELINE_CODE_PATTERNS = [
  /^(?:load|read|write|save)_/i,
  /^(?:extract|transform|ingest)/i,
  /^(?:setup|init|configure|connect)/i,
  /spark\.read/i,
  /\.write\./i,
  /\.save\(/i,
  /\.load\(/i,
  /pd\.read/i,
  /to_(?:csv|parquet|json)/i,
  /get_(?:connection|session|client)/i,
  /create_(?:table|database|schema)/i
]

export class LogicClassifier {
  private useAmpForAmbiguous: boolean

  constructor(options: { useAmpForAmbiguous?: boolean } = {}) {
    this.useAmpForAmbiguous = options.useAmpForAmbiguous ?? true
  }

  async classifyFunction(func: ExtractedFunction): Promise<ClassifiedFunction> {
    const result = await this.classify(
      func.name,
      func.sourceCode,
      func.docstring,
      func.businessRuleMarkers
    )

    return {
      ...func,
      classificationResult: result
    }
  }

  async classifySQLBlock(block: ExtractedSQLBlock): Promise<ClassifiedSQLBlock> {
    const result = await this.classify(
      block.name,
      block.sourceCode,
      block.description,
      block.businessRuleMarkers
    )

    return {
      ...block,
      classificationResult: result
    }
  }

  async classifyFunctions(functions: ExtractedFunction[]): Promise<ClassifiedFunction[]> {
    return Promise.all(functions.map(f => this.classifyFunction(f)))
  }

  async classifySQLBlocks(blocks: ExtractedSQLBlock[]): Promise<ClassifiedSQLBlock[]> {
    return Promise.all(blocks.map(b => this.classifySQLBlock(b)))
  }

  private async classify(
    name: string,
    sourceCode: string,
    description: string | null,
    businessRuleMarkers: string[]
  ): Promise<ClassificationResult> {
    if (businessRuleMarkers.length > 0) {
      return {
        classification: 'business_logic',
        confidence: 'high',
        reason: `Contains BUSINESS_RULE markers: ${businessRuleMarkers.join(', ')}`
      }
    }

    const textToAnalyze = `${name} ${sourceCode} ${description || ''}`

    const businessLogicScore = this.countPatternMatches(textToAnalyze, BUSINESS_LOGIC_PATTERNS)
    const pipelineCodeScore = this.countPatternMatches(textToAnalyze, PIPELINE_CODE_PATTERNS)

    if (businessLogicScore > 0 && pipelineCodeScore === 0) {
      return {
        classification: 'business_logic',
        confidence: businessLogicScore >= 2 ? 'high' : 'medium',
        reason: `Matches ${businessLogicScore} business logic patterns`
      }
    }

    if (pipelineCodeScore > 0 && businessLogicScore === 0) {
      return {
        classification: 'pipeline_code',
        confidence: pipelineCodeScore >= 2 ? 'high' : 'medium',
        reason: `Matches ${pipelineCodeScore} pipeline code patterns`
      }
    }

    if (businessLogicScore > pipelineCodeScore) {
      return {
        classification: 'business_logic',
        confidence: 'medium',
        reason: `Matches ${businessLogicScore} business logic patterns vs ${pipelineCodeScore} pipeline patterns`
      }
    }

    if (pipelineCodeScore > businessLogicScore) {
      return {
        classification: 'pipeline_code',
        confidence: 'medium',
        reason: `Matches ${pipelineCodeScore} pipeline patterns vs ${businessLogicScore} business logic patterns`
      }
    }

    if (this.useAmpForAmbiguous) {
      try {
        return await this.classifyWithAmp(name, sourceCode, description)
      } catch (error) {
        console.warn('Amp classification failed, using default:', error)
      }
    }

    return {
      classification: 'pipeline_code',
      confidence: 'low',
      reason: 'No clear patterns matched, defaulting to pipeline_code'
    }
  }

  private countPatternMatches(text: string, patterns: RegExp[]): number {
    return patterns.filter(pattern => pattern.test(text)).length
  }

  private async classifyWithAmp(
    name: string,
    sourceCode: string,
    description: string | null
  ): Promise<ClassificationResult> {
    const truncatedSource = sourceCode.length > 2000 
      ? sourceCode.substring(0, 2000) + '\n... (truncated)'
      : sourceCode

    const prompt = `Classify this function as either 'business_logic' or 'pipeline_code'.

Business Logic functions:
- Implement business rules, thresholds, or calculations
- Contain validation logic
- Calculate status indicators (RAG, scores, ratings)
- Implement domain-specific logic

Pipeline Code functions:
- Handle data loading, saving, or transformation
- Setup infrastructure or connections
- Perform ETL operations without business rules

Function: ${name}
${description ? `Description: ${description}` : ''}

Source Code:
\`\`\`python
${truncatedSource}
\`\`\`

Respond with ONLY valid JSON in this exact format:
{"classification": "business_logic" or "pipeline_code", "reason": "brief explanation"}`

    const response = await executePrompt(prompt)

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0]) as { classification: string; reason: string }

      if (parsed.classification !== 'business_logic' && parsed.classification !== 'pipeline_code') {
        throw new Error(`Invalid classification: ${parsed.classification}`)
      }

      return {
        classification: parsed.classification as Classification,
        confidence: 'medium',
        reason: `AI: ${parsed.reason}`
      }
    } catch (parseError) {
      console.warn('Failed to parse Amp response:', parseError)
      return {
        classification: 'pipeline_code',
        confidence: 'low',
        reason: 'AI classification failed, defaulting to pipeline_code'
      }
    }
  }
}
