import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import path from 'path'
import type { ClassifiedFunction, ClassifiedSQLBlock } from '../classifiers/logic-classifier.js'

export interface GeneratorOptions {
  outputDir: string
  sourceRepoUrl?: string
}

export class MarkdownGenerator {
  private options: GeneratorOptions

  constructor(options: GeneratorOptions) {
    this.options = options
  }

  generate(
    functions: ClassifiedFunction[],
    sqlBlocks: ClassifiedSQLBlock[]
  ): void {
    const businessLogicFunctions = functions.filter(f => f.classificationResult.classification === 'business_logic')
    const pipelineFunctions = functions.filter(f => f.classificationResult.classification === 'pipeline_code')
    const businessLogicSQL = sqlBlocks.filter(b => b.classificationResult.classification === 'business_logic')
    const pipelineSQL = sqlBlocks.filter(b => b.classificationResult.classification === 'pipeline_code')

    mkdirSync(path.join(this.options.outputDir, 'business-logic'), { recursive: true })
    mkdirSync(path.join(this.options.outputDir, 'pipeline-code'), { recursive: true })

    this.generateBusinessLogicDocs(businessLogicFunctions, businessLogicSQL)
    this.generatePipelineCodeDocs(pipelineFunctions, pipelineSQL)
    this.generateIndex(functions, sqlBlocks)
  }

  private generateBusinessLogicDocs(
    functions: ClassifiedFunction[],
    sqlBlocks: ClassifiedSQLBlock[]
  ): void {
    const functionsByFile = this.groupByFile(functions)
    const sqlByFile = this.groupByFile(sqlBlocks)

    for (const [file, fileFunctions] of Object.entries(functionsByFile)) {
      const markdown = this.generateFunctionsDocs(fileFunctions, file)
      const outputPath = path.join(
        this.options.outputDir,
        'business-logic',
        this.fileToMarkdownPath(file)
      )
      this.writeFile(outputPath, markdown)
    }

    for (const [file, fileBlocks] of Object.entries(sqlByFile)) {
      const markdown = this.generateSQLDocs(fileBlocks, file)
      const outputPath = path.join(
        this.options.outputDir,
        'business-logic',
        this.fileToMarkdownPath(file)
      )
      this.writeFile(outputPath, markdown)
    }

    this.generateCategoryIndex('business-logic', functions, sqlBlocks)
  }

  private generatePipelineCodeDocs(
    functions: ClassifiedFunction[],
    sqlBlocks: ClassifiedSQLBlock[]
  ): void {
    const functionsByFile = this.groupByFile(functions)
    const sqlByFile = this.groupByFile(sqlBlocks)

    for (const [file, fileFunctions] of Object.entries(functionsByFile)) {
      const markdown = this.generateFunctionsDocs(fileFunctions, file)
      const outputPath = path.join(
        this.options.outputDir,
        'pipeline-code',
        this.fileToMarkdownPath(file)
      )
      this.writeFile(outputPath, markdown)
    }

    for (const [file, fileBlocks] of Object.entries(sqlByFile)) {
      const markdown = this.generateSQLDocs(fileBlocks, file)
      const outputPath = path.join(
        this.options.outputDir,
        'pipeline-code',
        this.fileToMarkdownPath(file)
      )
      this.writeFile(outputPath, markdown)
    }

    this.generateCategoryIndex('pipeline-code', functions, sqlBlocks)
  }

  private generateFunctionsDocs(functions: ClassifiedFunction[], file: string): string {
    const lines: string[] = []

    lines.push(`# ${path.basename(file)}`)
    lines.push('')
    lines.push(`**File:** \`${file}\``)
    lines.push('')
    lines.push('---')
    lines.push('')

    for (const func of functions) {
      lines.push(`## ${func.name}`)
      lines.push('')

      if (this.options.sourceRepoUrl) {
        const fileUrl = `${this.options.sourceRepoUrl}/blob/main/${func.filePath}#L${func.startLine}-L${func.endLine}`
        lines.push(`[View Source](${fileUrl})`)
        lines.push('')
      }

      lines.push('### Signature')
      lines.push('```python')
      lines.push(func.signature)
      lines.push('```')
      lines.push('')

      if (func.docstring) {
        lines.push('### Description')
        lines.push(func.docstring)
        lines.push('')
      }

      if (func.businessRuleMarkers.length > 0) {
        lines.push('### Business Rules')
        for (const marker of func.businessRuleMarkers) {
          lines.push(`- ${marker}`)
        }
        lines.push('')
      }

      if (func.parameters.length > 0) {
        lines.push('### Parameters')
        lines.push('| Name | Type | Default |')
        lines.push('|------|------|---------|')
        for (const param of func.parameters) {
          lines.push(`| \`${param.name}\` | ${param.type || '-'} | ${param.default || '-'} |`)
        }
        lines.push('')
      }

      if (func.returnType) {
        lines.push('### Returns')
        lines.push(`- \`${func.returnType}\``)
        lines.push('')
      }

      if (func.decorators.length > 0) {
        lines.push('### Decorators')
        for (const dec of func.decorators) {
          lines.push(`- \`${dec}\``)
        }
        lines.push('')
      }

      lines.push(`*Classification: ${func.classificationResult.classification} (${func.classificationResult.confidence} confidence)*`)
      lines.push(`*Reason: ${func.classificationResult.reason}*`)
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  private generateSQLDocs(blocks: ClassifiedSQLBlock[], file: string): string {
    const lines: string[] = []

    lines.push(`# ${path.basename(file)}`)
    lines.push('')
    lines.push(`**File:** \`${file}\``)
    lines.push('')
    lines.push('---')
    lines.push('')

    for (const block of blocks) {
      lines.push(`## ${block.name}`)
      lines.push('')
      lines.push(`**Type:** ${block.sqlType}`)
      lines.push('')

      if (block.description) {
        lines.push('### Description')
        lines.push(block.description)
        lines.push('')
      }

      if (block.businessRuleMarkers.length > 0) {
        lines.push('### Business Rules')
        for (const marker of block.businessRuleMarkers) {
          lines.push(`- ${marker}`)
        }
        lines.push('')
      }

      if (block.tables.length > 0) {
        lines.push('### Tables Referenced')
        for (const table of block.tables) {
          lines.push(`- \`${table}\``)
        }
        lines.push('')
      }

      lines.push('### Source')
      lines.push('```sql')
      lines.push(block.sourceCode)
      lines.push('```')
      lines.push('')

      lines.push(`*Classification: ${block.classificationResult.classification} (${block.classificationResult.confidence} confidence)*`)
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  private generateCategoryIndex(
    category: string,
    functions: ClassifiedFunction[],
    sqlBlocks: ClassifiedSQLBlock[]
  ): void {
    const lines: string[] = []
    const title = category === 'business-logic' ? 'Business Logic' : 'Pipeline Code'

    lines.push(`# ${title} Documentation`)
    lines.push('')
    lines.push(`This directory contains auto-generated documentation for ${title.toLowerCase()} functions.`)
    lines.push('')
    lines.push('## Summary')
    lines.push(`- **Python Functions:** ${functions.length}`)
    lines.push(`- **SQL Blocks:** ${sqlBlocks.length}`)
    lines.push('')

    if (functions.length > 0) {
      lines.push('## Python Functions')
      lines.push('')

      const byFile = this.groupByFile(functions)
      for (const [file, fileFunctions] of Object.entries(byFile)) {
        const mdPath = this.fileToMarkdownPath(file)
        lines.push(`### [${path.basename(file)}](./${mdPath})`)
        for (const func of fileFunctions) {
          lines.push(`- \`${func.name}\``)
        }
        lines.push('')
      }
    }

    if (sqlBlocks.length > 0) {
      lines.push('## SQL')
      lines.push('')

      const byFile = this.groupByFile(sqlBlocks)
      for (const [file, fileBlocks] of Object.entries(byFile)) {
        const mdPath = this.fileToMarkdownPath(file)
        lines.push(`### [${path.basename(file)}](./${mdPath})`)
        for (const block of fileBlocks) {
          lines.push(`- \`${block.name}\` (${block.sqlType})`)
        }
        lines.push('')
      }
    }

    const outputPath = path.join(this.options.outputDir, category, 'README.md')
    this.writeFile(outputPath, lines.join('\n'))
  }

  private generateIndex(
    functions: ClassifiedFunction[],
    sqlBlocks: ClassifiedSQLBlock[]
  ): void {
    const businessLogicFunctions = functions.filter(f => f.classificationResult.classification === 'business_logic')
    const pipelineFunctions = functions.filter(f => f.classificationResult.classification === 'pipeline_code')
    const businessLogicSQL = sqlBlocks.filter(b => b.classificationResult.classification === 'business_logic')
    const pipelineSQL = sqlBlocks.filter(b => b.classificationResult.classification === 'pipeline_code')

    const lines: string[] = []

    lines.push('# Business Logic Documentation Index')
    lines.push('')
    lines.push('Auto-generated documentation extracted from source code.')
    lines.push('')
    lines.push(`**Generated:** ${new Date().toISOString()}`)
    lines.push('')
    lines.push('## Overview')
    lines.push('')
    lines.push('| Category | Python Functions | SQL Blocks |')
    lines.push('|----------|------------------|------------|')
    lines.push(`| [Business Logic](./business-logic/) | ${businessLogicFunctions.length} | ${businessLogicSQL.length} |`)
    lines.push(`| [Pipeline Code](./pipeline-code/) | ${pipelineFunctions.length} | ${pipelineSQL.length} |`)
    lines.push(`| **Total** | **${functions.length}** | **${sqlBlocks.length}** |`)
    lines.push('')

    lines.push('## Quick Links')
    lines.push('')
    lines.push('### Business Logic')
    lines.push('')
    for (const func of businessLogicFunctions.slice(0, 10)) {
      const mdPath = this.fileToMarkdownPath(func.filePath)
      lines.push(`- [\`${func.name}\`](./business-logic/${mdPath}#${func.name.toLowerCase()}) - ${func.docstring?.split('\n')[0] || 'No description'}`)
    }
    if (businessLogicFunctions.length > 10) {
      lines.push(`- ... and ${businessLogicFunctions.length - 10} more`)
    }
    lines.push('')

    lines.push('### Pipeline Code')
    lines.push('')
    for (const func of pipelineFunctions.slice(0, 10)) {
      const mdPath = this.fileToMarkdownPath(func.filePath)
      lines.push(`- [\`${func.name}\`](./pipeline-code/${mdPath}#${func.name.toLowerCase()}) - ${func.docstring?.split('\n')[0] || 'No description'}`)
    }
    if (pipelineFunctions.length > 10) {
      lines.push(`- ... and ${pipelineFunctions.length - 10} more`)
    }
    lines.push('')

    const outputPath = path.join(this.options.outputDir, 'index.md')
    this.writeFile(outputPath, lines.join('\n'))
  }

  private groupByFile<T extends { filePath: string }>(items: T[]): Record<string, T[]> {
    const grouped: Record<string, T[]> = {}
    for (const item of items) {
      if (!grouped[item.filePath]) {
        grouped[item.filePath] = []
      }
      grouped[item.filePath].push(item)
    }
    return grouped
  }

  private fileToMarkdownPath(filePath: string): string {
    return filePath
      .replace(/\//g, '-')
      .replace(/\.(py|sql)$/, '.md')
  }

  private writeFile(filePath: string, content: string): void {
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, content)
    console.log(`Generated: ${filePath}`)
  }
}
