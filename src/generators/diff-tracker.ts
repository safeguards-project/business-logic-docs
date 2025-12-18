import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { ClassifiedFunction, ClassifiedSQLBlock } from '../classifiers/logic-classifier.js'

export interface ExtractionSnapshot {
  timestamp: string
  commit?: string
  functions: FunctionSnapshot[]
  sqlBlocks: SQLBlockSnapshot[]
}

interface FunctionSnapshot {
  name: string
  filePath: string
  signature: string
  classification: string
  hash: string
}

interface SQLBlockSnapshot {
  name: string
  filePath: string
  sqlType: string
  classification: string
  hash: string
}

export interface DiffResult {
  added: {
    functions: FunctionSnapshot[]
    sqlBlocks: SQLBlockSnapshot[]
  }
  removed: {
    functions: FunctionSnapshot[]
    sqlBlocks: SQLBlockSnapshot[]
  }
  modified: {
    functions: Array<{ previous: FunctionSnapshot; current: FunctionSnapshot }>
    sqlBlocks: Array<{ previous: SQLBlockSnapshot; current: SQLBlockSnapshot }>
  }
  reclassified: {
    functions: Array<{ name: string; filePath: string; from: string; to: string }>
    sqlBlocks: Array<{ name: string; filePath: string; from: string; to: string }>
  }
}

export class DiffTracker {
  private snapshotDir: string

  constructor(snapshotDir: string) {
    this.snapshotDir = snapshotDir
    mkdirSync(snapshotDir, { recursive: true })
  }

  createSnapshot(
    functions: ClassifiedFunction[],
    sqlBlocks: ClassifiedSQLBlock[],
    commit?: string
  ): ExtractionSnapshot {
    return {
      timestamp: new Date().toISOString(),
      commit,
      functions: functions.map(f => ({
        name: f.name,
        filePath: f.filePath,
        signature: f.signature,
        classification: f.classificationResult.classification,
        hash: this.hashContent(f.sourceCode)
      })),
      sqlBlocks: sqlBlocks.map(b => ({
        name: b.name,
        filePath: b.filePath,
        sqlType: b.sqlType,
        classification: b.classificationResult.classification,
        hash: this.hashContent(b.sourceCode)
      }))
    }
  }

  saveSnapshot(snapshot: ExtractionSnapshot): void {
    const latestPath = path.join(this.snapshotDir, 'latest.json')
    const historyPath = path.join(this.snapshotDir, `snapshot-${Date.now()}.json`)

    if (existsSync(latestPath)) {
      const previous = readFileSync(latestPath, 'utf-8')
      writeFileSync(historyPath.replace(`snapshot-${Date.now()}`, `snapshot-${this.getTimestampFromSnapshot(previous)}`), previous)
    }

    writeFileSync(latestPath, JSON.stringify(snapshot, null, 2))
  }

  loadPreviousSnapshot(): ExtractionSnapshot | null {
    const latestPath = path.join(this.snapshotDir, 'latest.json')

    if (!existsSync(latestPath)) {
      return null
    }

    try {
      const content = readFileSync(latestPath, 'utf-8')
      return JSON.parse(content) as ExtractionSnapshot
    } catch (error) {
      console.warn('Failed to load previous snapshot:', error)
      return null
    }
  }

  computeDiff(previous: ExtractionSnapshot | null, current: ExtractionSnapshot): DiffResult {
    if (!previous) {
      return {
        added: {
          functions: current.functions,
          sqlBlocks: current.sqlBlocks
        },
        removed: {
          functions: [],
          sqlBlocks: []
        },
        modified: {
          functions: [],
          sqlBlocks: []
        },
        reclassified: {
          functions: [],
          sqlBlocks: []
        }
      }
    }

    const result: DiffResult = {
      added: { functions: [], sqlBlocks: [] },
      removed: { functions: [], sqlBlocks: [] },
      modified: { functions: [], sqlBlocks: [] },
      reclassified: { functions: [], sqlBlocks: [] }
    }

    const prevFunctionMap = new Map(
      previous.functions.map(f => [`${f.filePath}:${f.name}`, f])
    )
    const currFunctionMap = new Map(
      current.functions.map(f => [`${f.filePath}:${f.name}`, f])
    )

    for (const [key, curr] of currFunctionMap) {
      const prev = prevFunctionMap.get(key)
      if (!prev) {
        result.added.functions.push(curr)
      } else if (prev.hash !== curr.hash) {
        result.modified.functions.push({ previous: prev, current: curr })
        if (prev.classification !== curr.classification) {
          result.reclassified.functions.push({
            name: curr.name,
            filePath: curr.filePath,
            from: prev.classification,
            to: curr.classification
          })
        }
      } else if (prev.classification !== curr.classification) {
        result.reclassified.functions.push({
          name: curr.name,
          filePath: curr.filePath,
          from: prev.classification,
          to: curr.classification
        })
      }
    }

    for (const [key, prev] of prevFunctionMap) {
      if (!currFunctionMap.has(key)) {
        result.removed.functions.push(prev)
      }
    }

    const prevSQLMap = new Map(
      previous.sqlBlocks.map(b => [`${b.filePath}:${b.name}`, b])
    )
    const currSQLMap = new Map(
      current.sqlBlocks.map(b => [`${b.filePath}:${b.name}`, b])
    )

    for (const [key, curr] of currSQLMap) {
      const prev = prevSQLMap.get(key)
      if (!prev) {
        result.added.sqlBlocks.push(curr)
      } else if (prev.hash !== curr.hash) {
        result.modified.sqlBlocks.push({ previous: prev, current: curr })
        if (prev.classification !== curr.classification) {
          result.reclassified.sqlBlocks.push({
            name: curr.name,
            filePath: curr.filePath,
            from: prev.classification,
            to: curr.classification
          })
        }
      } else if (prev.classification !== curr.classification) {
        result.reclassified.sqlBlocks.push({
          name: curr.name,
          filePath: curr.filePath,
          from: prev.classification,
          to: curr.classification
        })
      }
    }

    for (const [key, prev] of prevSQLMap) {
      if (!currSQLMap.has(key)) {
        result.removed.sqlBlocks.push(prev)
      }
    }

    return result
  }

  generateDiffReport(diff: DiffResult): string {
    const lines: string[] = []

    lines.push('# Documentation Changes Report')
    lines.push('')
    lines.push(`**Generated:** ${new Date().toISOString()}`)
    lines.push('')

    const totalAdded = diff.added.functions.length + diff.added.sqlBlocks.length
    const totalRemoved = diff.removed.functions.length + diff.removed.sqlBlocks.length
    const totalModified = diff.modified.functions.length + diff.modified.sqlBlocks.length
    const totalReclassified = diff.reclassified.functions.length + diff.reclassified.sqlBlocks.length

    lines.push('## Summary')
    lines.push('')
    lines.push(`- ➕ Added: ${totalAdded}`)
    lines.push(`- ➖ Removed: ${totalRemoved}`)
    lines.push(`- ✏️ Modified: ${totalModified}`)
    lines.push(`- 🔄 Reclassified: ${totalReclassified}`)
    lines.push('')

    if (diff.added.functions.length > 0) {
      lines.push('## Added Functions')
      lines.push('')
      for (const f of diff.added.functions) {
        lines.push(`- \`${f.name}\` in \`${f.filePath}\` (${f.classification})`)
      }
      lines.push('')
    }

    if (diff.added.sqlBlocks.length > 0) {
      lines.push('## Added SQL Blocks')
      lines.push('')
      for (const b of diff.added.sqlBlocks) {
        lines.push(`- \`${b.name}\` in \`${b.filePath}\` (${b.classification})`)
      }
      lines.push('')
    }

    if (diff.removed.functions.length > 0) {
      lines.push('## Removed Functions')
      lines.push('')
      for (const f of diff.removed.functions) {
        lines.push(`- \`${f.name}\` from \`${f.filePath}\``)
      }
      lines.push('')
    }

    if (diff.removed.sqlBlocks.length > 0) {
      lines.push('## Removed SQL Blocks')
      lines.push('')
      for (const b of diff.removed.sqlBlocks) {
        lines.push(`- \`${b.name}\` from \`${b.filePath}\``)
      }
      lines.push('')
    }

    if (diff.modified.functions.length > 0) {
      lines.push('## Modified Functions')
      lines.push('')
      for (const { current } of diff.modified.functions) {
        lines.push(`- \`${current.name}\` in \`${current.filePath}\``)
      }
      lines.push('')
    }

    if (diff.reclassified.functions.length > 0 || diff.reclassified.sqlBlocks.length > 0) {
      lines.push('## Reclassified Items')
      lines.push('')
      for (const item of [...diff.reclassified.functions, ...diff.reclassified.sqlBlocks]) {
        lines.push(`- \`${item.name}\` in \`${item.filePath}\`: ${item.from} → ${item.to}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex')
  }

  private getTimestampFromSnapshot(content: string): string {
    try {
      const snapshot = JSON.parse(content) as ExtractionSnapshot
      return new Date(snapshot.timestamp).getTime().toString()
    } catch {
      return Date.now().toString()
    }
  }
}
