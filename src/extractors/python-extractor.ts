import Parser from 'tree-sitter'
import Python from 'tree-sitter-python'
import { readFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

export interface ExtractedFunction {
  name: string
  filePath: string
  startLine: number
  endLine: number
  signature: string
  parameters: ParameterInfo[]
  returnType: string | null
  docstring: string | null
  businessRuleMarkers: string[]
  sourceCode: string
  decorators: string[]
}

export interface ParameterInfo {
  name: string
  type: string | null
  default: string | null
}

export class PythonExtractor {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    this.parser.setLanguage(Python as unknown as Parser.Language)
  }

  async extractFromDirectory(dirPath: string): Promise<ExtractedFunction[]> {
    const pythonFiles = await glob('**/*.py', {
      cwd: dirPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/__pycache__/**', '**/venv/**', '**/.venv/**']
    })

    const allFunctions: ExtractedFunction[] = []

    for (const filePath of pythonFiles) {
      try {
        const functions = this.extractFromFile(filePath)
        allFunctions.push(...functions)
      } catch (error) {
        console.error(`Error extracting from ${filePath}:`, error)
      }
    }

    return allFunctions
  }

  extractFromFile(filePath: string): ExtractedFunction[] {
    const source = readFileSync(filePath, 'utf-8')
    return this.extractFromSource(source, filePath)
  }

  extractFromSource(source: string, filePath: string = '<source>'): ExtractedFunction[] {
    const tree = this.parser.parse(source)
    const functions: ExtractedFunction[] = []
    const sourceLines = source.split('\n')

    this.traverseNode(tree.rootNode, sourceLines, filePath, functions)

    return functions
  }

  private traverseNode(
    node: Parser.SyntaxNode,
    sourceLines: string[],
    filePath: string,
    functions: ExtractedFunction[]
  ): void {
    if (node.type === 'function_definition' || node.type === 'async_function_definition') {
      const extracted = this.extractFunction(node, sourceLines, filePath)
      if (extracted) {
        functions.push(extracted)
      }
    }

    if (node.type === 'class_definition') {
      const classNode = node
      for (const child of classNode.children) {
        if (child.type === 'block') {
          this.traverseNode(child, sourceLines, filePath, functions)
        }
      }
    } else {
      for (const child of node.children) {
        this.traverseNode(child, sourceLines, filePath, functions)
      }
    }
  }

  private extractFunction(
    node: Parser.SyntaxNode,
    sourceLines: string[],
    filePath: string
  ): ExtractedFunction | null {
    const nameNode = node.childForFieldName('name')
    if (!nameNode) return null

    const name = nameNode.text
    const startLine = node.startPosition.row + 1
    const endLine = node.endPosition.row + 1

    const parameters = this.extractParameters(node)
    const returnType = this.extractReturnType(node)
    const docstring = this.extractDocstring(node)
    const decorators = this.extractDecorators(node, sourceLines)
    const sourceCode = sourceLines.slice(startLine - 1, endLine).join('\n')
    const businessRuleMarkers = this.extractBusinessRuleMarkers(docstring, sourceCode)

    const signature = this.buildSignature(name, parameters, returnType)

    return {
      name,
      filePath: path.relative(process.cwd(), filePath),
      startLine,
      endLine,
      signature,
      parameters,
      returnType,
      docstring,
      businessRuleMarkers,
      sourceCode,
      decorators
    }
  }

  private extractParameters(node: Parser.SyntaxNode): ParameterInfo[] {
    const params: ParameterInfo[] = []
    const parametersNode = node.childForFieldName('parameters')

    if (!parametersNode) return params

    for (const child of parametersNode.children) {
      if (child.type === 'identifier') {
        params.push({ name: child.text, type: null, default: null })
      } else if (child.type === 'typed_parameter') {
        const nameNode = child.childForFieldName('name') || child.children.find(c => c.type === 'identifier')
        const typeNode = child.childForFieldName('type')
        params.push({
          name: nameNode?.text || '',
          type: typeNode?.text || null,
          default: null
        })
      } else if (child.type === 'default_parameter') {
        const nameNode = child.childForFieldName('name')
        const valueNode = child.childForFieldName('value')
        params.push({
          name: nameNode?.text || '',
          type: null,
          default: valueNode?.text || null
        })
      } else if (child.type === 'typed_default_parameter') {
        const nameNode = child.childForFieldName('name')
        const typeNode = child.childForFieldName('type')
        const valueNode = child.childForFieldName('value')
        params.push({
          name: nameNode?.text || '',
          type: typeNode?.text || null,
          default: valueNode?.text || null
        })
      }
    }

    return params.filter(p => p.name && p.name !== 'self' && p.name !== 'cls')
  }

  private extractReturnType(node: Parser.SyntaxNode): string | null {
    const returnTypeNode = node.childForFieldName('return_type')
    return returnTypeNode?.text || null
  }

  private extractDocstring(node: Parser.SyntaxNode): string | null {
    const bodyNode = node.childForFieldName('body')
    if (!bodyNode) return null

    const firstStatement = bodyNode.children.find(c => c.type === 'expression_statement')
    if (!firstStatement) return null

    const stringNode = firstStatement.children.find(c => c.type === 'string')
    if (!stringNode) return null

    let docstring = stringNode.text
    docstring = docstring.replace(/^('''|"""|'|")/, '').replace(/('''|"""|'|")$/, '')
    return docstring.trim()
  }

  private extractDecorators(node: Parser.SyntaxNode, sourceLines: string[]): string[] {
    const decorators: string[] = []
    let prevSibling = node.previousSibling

    while (prevSibling && prevSibling.type === 'decorator') {
      decorators.unshift(prevSibling.text)
      prevSibling = prevSibling.previousSibling
    }

    return decorators
  }

  private extractBusinessRuleMarkers(docstring: string | null, sourceCode: string): string[] {
    const markers: string[] = []
    const markerPattern = /BUSINESS_RULE\s*[:=]?\s*(.+?)(?:\n|$)/gi

    const textToSearch = (docstring || '') + '\n' + sourceCode

    let match
    while ((match = markerPattern.exec(textToSearch)) !== null) {
      markers.push(match[1].trim())
    }

    return markers
  }

  private buildSignature(name: string, params: ParameterInfo[], returnType: string | null): string {
    const paramStrings = params.map(p => {
      let s = p.name
      if (p.type) s += `: ${p.type}`
      if (p.default) s += ` = ${p.default}`
      return s
    })

    let sig = `def ${name}(${paramStrings.join(', ')})`
    if (returnType) sig += ` -> ${returnType}`
    return sig
  }
}
