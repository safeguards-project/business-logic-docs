import Parser, { Language } from 'web-tree-sitter'
import { readFileSync, existsSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

export interface ExtractedSQLBlock {
  name: string
  filePath: string
  startLine: number
  endLine: number
  sqlType: 'query' | 'procedure' | 'function' | 'view' | 'trigger'
  description: string | null
  businessRuleMarkers: string[]
  sourceCode: string
  tables: string[]
  columns: string[]
}

export class SQLExtractor {
  private parser: Parser | null = null
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    await Parser.init()
    this.parser = new Parser()

    const wasmPath = path.join(
      process.cwd(),
      'node_modules',
      'tree-sitter-sql',
      'tree-sitter-sql.wasm'
    )

    if (existsSync(wasmPath)) {
      const SQL = await Parser.Language.load(wasmPath)
      this.parser.setLanguage(SQL)
    }

    this.initialized = true
  }

  async extractFromDirectory(dirPath: string): Promise<ExtractedSQLBlock[]> {
    await this.initialize()

    const sqlFiles = await glob('**/*.sql', {
      cwd: dirPath,
      absolute: true,
      ignore: ['**/node_modules/**']
    })

    const allBlocks: ExtractedSQLBlock[] = []

    for (const filePath of sqlFiles) {
      try {
        const blocks = await this.extractFromFile(filePath)
        allBlocks.push(...blocks)
      } catch (error) {
        console.error(`Error extracting from ${filePath}:`, error)
      }
    }

    const pysparkFiles = await glob('**/*.py', {
      cwd: dirPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/__pycache__/**', '**/venv/**']
    })

    for (const filePath of pysparkFiles) {
      try {
        const blocks = await this.extractEmbeddedSQL(filePath)
        allBlocks.push(...blocks)
      } catch (error) {
        console.error(`Error extracting embedded SQL from ${filePath}:`, error)
      }
    }

    return allBlocks
  }

  async extractFromFile(filePath: string): Promise<ExtractedSQLBlock[]> {
    const source = readFileSync(filePath, 'utf-8')
    return this.extractFromSource(source, filePath)
  }

  async extractFromSource(source: string, filePath: string = '<source>'): Promise<ExtractedSQLBlock[]> {
    const blocks: ExtractedSQLBlock[] = []
    const statements = this.splitSQLStatements(source)

    for (const stmt of statements) {
      const block = this.parseStatement(stmt.text, stmt.startLine, filePath)
      if (block) {
        blocks.push(block)
      }
    }

    return blocks
  }

  private async extractEmbeddedSQL(filePath: string): Promise<ExtractedSQLBlock[]> {
    const source = readFileSync(filePath, 'utf-8')
    const blocks: ExtractedSQLBlock[] = []

    const sparkSqlPattern = /(?:spark\.sql|execute|sql)\s*\(\s*(?:f?"""([\s\S]*?)"""|f?'''([\s\S]*?)'''|f?"([^"]*?)"|f?'([^']*?)')/g

    let match
    while ((match = sparkSqlPattern.exec(source)) !== null) {
      const sqlContent = match[1] || match[2] || match[3] || match[4]
      if (sqlContent && this.looksLikeSQL(sqlContent)) {
        const startLine = source.substring(0, match.index).split('\n').length

        const block = this.parseStatement(sqlContent, startLine, filePath)
        if (block) {
          block.name = `embedded_sql_${blocks.length + 1}`
          blocks.push(block)
        }
      }
    }

    return blocks
  }

  private looksLikeSQL(text: string): boolean {
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i
    return sqlKeywords.test(text)
  }

  private splitSQLStatements(source: string): Array<{ text: string; startLine: number }> {
    const statements: Array<{ text: string; startLine: number }> = []
    const lines = source.split('\n')

    let currentStatement = ''
    let startLine = 1
    let inStatement = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      if (trimmed.startsWith('--') || trimmed === '') {
        if (!inStatement) {
          currentStatement += line + '\n'
        } else {
          currentStatement += line + '\n'
        }
        continue
      }

      if (!inStatement) {
        startLine = i + 1
        inStatement = true
      }

      currentStatement += line + '\n'

      if (trimmed.endsWith(';')) {
        if (currentStatement.trim()) {
          statements.push({ text: currentStatement.trim(), startLine })
        }
        currentStatement = ''
        inStatement = false
      }
    }

    if (currentStatement.trim()) {
      statements.push({ text: currentStatement.trim(), startLine })
    }

    return statements
  }

  private parseStatement(sql: string, startLine: number, filePath: string): ExtractedSQLBlock | null {
    const sqlType = this.determineSQLType(sql)
    const name = this.extractName(sql, sqlType)
    const description = this.extractDescription(sql)
    const businessRuleMarkers = this.extractBusinessRuleMarkers(sql)
    const tables = this.extractTables(sql)
    const columns = this.extractColumns(sql)

    const endLine = startLine + sql.split('\n').length - 1

    return {
      name,
      filePath: path.relative(process.cwd(), filePath),
      startLine,
      endLine,
      sqlType,
      description,
      businessRuleMarkers,
      sourceCode: sql,
      tables,
      columns
    }
  }

  private determineSQLType(sql: string): ExtractedSQLBlock['sqlType'] {
    const normalized = sql.toUpperCase().trim()

    if (/^CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE/.test(normalized)) return 'procedure'
    if (/^CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/.test(normalized)) return 'function'
    if (/^CREATE\s+(OR\s+REPLACE\s+)?VIEW/.test(normalized)) return 'view'
    if (/^CREATE\s+(OR\s+REPLACE\s+)?TRIGGER/.test(normalized)) return 'trigger'
    return 'query'
  }

  private extractName(sql: string, sqlType: ExtractedSQLBlock['sqlType']): string {
    if (sqlType === 'query') {
      const commentMatch = sql.match(/--\s*name:\s*(\w+)/i)
      if (commentMatch) return commentMatch[1]

      const withMatch = sql.match(/WITH\s+(\w+)\s+AS/i)
      if (withMatch) return `cte_${withMatch[1]}`

      return 'unnamed_query'
    }

    const patterns: Record<string, RegExp> = {
      procedure: /CREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE\s+(\w+)/i,
      function: /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/i,
      view: /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(\w+)/i,
      trigger: /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(\w+)/i
    }

    const pattern = patterns[sqlType]
    if (pattern) {
      const match = sql.match(pattern)
      if (match) return match[1]
    }

    return `unnamed_${sqlType}`
  }

  private extractDescription(sql: string): string | null {
    const lines = sql.split('\n')
    const comments: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('--')) {
        const comment = trimmed.replace(/^--\s*/, '')
        if (!comment.toLowerCase().startsWith('business_rule')) {
          comments.push(comment)
        }
      } else if (trimmed && !trimmed.startsWith('/*')) {
        break
      }
    }

    return comments.length > 0 ? comments.join(' ') : null
  }

  private extractBusinessRuleMarkers(sql: string): string[] {
    const markers: string[] = []
    const pattern = /--\s*BUSINESS_RULE\s*[:=]?\s*(.+?)$/gim

    let match
    while ((match = pattern.exec(sql)) !== null) {
      markers.push(match[1].trim())
    }

    return markers
  }

  private extractTables(sql: string): string[] {
    const tables = new Set<string>()

    const fromPattern = /\bFROM\s+(\w+(?:\.\w+)?)/gi
    const joinPattern = /\bJOIN\s+(\w+(?:\.\w+)?)/gi
    const intoPattern = /\bINTO\s+(\w+(?:\.\w+)?)/gi
    const updatePattern = /\bUPDATE\s+(\w+(?:\.\w+)?)/gi

    for (const pattern of [fromPattern, joinPattern, intoPattern, updatePattern]) {
      let match
      while ((match = pattern.exec(sql)) !== null) {
        tables.add(match[1])
      }
    }

    return Array.from(tables)
  }

  private extractColumns(sql: string): string[] {
    const columns = new Set<string>()

    const selectMatch = sql.match(/SELECT\s+([\s\S]*?)\s+FROM/i)
    if (selectMatch) {
      const selectClause = selectMatch[1]
      const parts = selectClause.split(',')

      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed === '*') continue

        const aliasMatch = trimmed.match(/(?:\w+\.)?\w+\s+(?:AS\s+)?(\w+)$/i)
        if (aliasMatch) {
          columns.add(aliasMatch[1])
        } else {
          const colMatch = trimmed.match(/(\w+)$/)
          if (colMatch) {
            columns.add(colMatch[1])
          }
        }
      }
    }

    return Array.from(columns)
  }
}
