import path from 'path'
import { PythonExtractor } from './extractors/python-extractor.js'
import { SQLExtractor } from './extractors/sql-extractor.js'
import { LogicClassifier } from './classifiers/logic-classifier.js'
import { MarkdownGenerator } from './generators/markdown-generator.js'
import { DiffTracker } from './generators/diff-tracker.js'

interface ExtractionOptions {
  sourceCodePath: string
  outputDir: string
  snapshotDir: string
  sourceRepoUrl?: string
  useAmpForClassification?: boolean
  commit?: string
}

async function extract(options: ExtractionOptions): Promise<void> {
  console.log('Starting extraction...')
  console.log(`Source: ${options.sourceCodePath}`)
  console.log(`Output: ${options.outputDir}`)

  const pythonExtractor = new PythonExtractor()
  const sqlExtractor = new SQLExtractor()
  const classifier = new LogicClassifier({
    useAmpForAmbiguous: options.useAmpForClassification ?? true
  })

  console.log('\n📂 Extracting Python functions...')
  const functions = await pythonExtractor.extractFromDirectory(options.sourceCodePath)
  console.log(`Found ${functions.length} Python functions`)

  console.log('\n📂 Extracting SQL blocks...')
  const sqlBlocks = await sqlExtractor.extractFromDirectory(options.sourceCodePath)
  console.log(`Found ${sqlBlocks.length} SQL blocks`)

  console.log('\n🏷️  Classifying functions...')
  const classifiedFunctions = await classifier.classifyFunctions(functions)
  const businessLogicCount = classifiedFunctions.filter(
    f => f.classificationResult.classification === 'business_logic'
  ).length
  console.log(`  Business Logic: ${businessLogicCount}`)
  console.log(`  Pipeline Code: ${classifiedFunctions.length - businessLogicCount}`)

  console.log('\n🏷️  Classifying SQL blocks...')
  const classifiedSQLBlocks = await classifier.classifySQLBlocks(sqlBlocks)
  const sqlBusinessLogicCount = classifiedSQLBlocks.filter(
    b => b.classificationResult.classification === 'business_logic'
  ).length
  console.log(`  Business Logic: ${sqlBusinessLogicCount}`)
  console.log(`  Pipeline Code: ${classifiedSQLBlocks.length - sqlBusinessLogicCount}`)

  const diffTracker = new DiffTracker(options.snapshotDir)
  const previousSnapshot = diffTracker.loadPreviousSnapshot()
  const currentSnapshot = diffTracker.createSnapshot(
    classifiedFunctions,
    classifiedSQLBlocks,
    options.commit
  )

  const diff = diffTracker.computeDiff(previousSnapshot, currentSnapshot)

  if (previousSnapshot) {
    console.log('\n📊 Changes detected:')
    console.log(`  Added: ${diff.added.functions.length + diff.added.sqlBlocks.length}`)
    console.log(`  Removed: ${diff.removed.functions.length + diff.removed.sqlBlocks.length}`)
    console.log(`  Modified: ${diff.modified.functions.length + diff.modified.sqlBlocks.length}`)
    console.log(`  Reclassified: ${diff.reclassified.functions.length + diff.reclassified.sqlBlocks.length}`)
  }

  console.log('\n📝 Generating documentation...')
  const generator = new MarkdownGenerator({
    outputDir: options.outputDir,
    sourceRepoUrl: options.sourceRepoUrl
  })
  generator.generate(classifiedFunctions, classifiedSQLBlocks)

  diffTracker.saveSnapshot(currentSnapshot)

  console.log('\n✅ Extraction complete!')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0] || 'extract'

  if (command === 'extract') {
    const sourceCodePath = process.env.SOURCE_CODE_PATH || path.resolve('../source-code')
    const outputDir = process.env.OUTPUT_DIR || path.resolve('./docs')
    const snapshotDir = process.env.SNAPSHOT_DIR || path.resolve('./.snapshots')
    const sourceRepoUrl = process.env.SOURCE_REPO_URL
    const commit = process.env.SOURCE_COMMIT_SHA

    await extract({
      sourceCodePath,
      outputDir,
      snapshotDir,
      sourceRepoUrl,
      commit,
      useAmpForClassification: !!process.env.AMP_API_KEY
    })
  } else {
    console.error(`Unknown command: ${command}`)
    console.log('Usage: npm run extract')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
