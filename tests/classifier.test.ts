import { describe, it, expect } from 'vitest'
import { LogicClassifier } from '../src/classifiers/logic-classifier.js'
import type { ExtractedFunction } from '../src/extractors/python-extractor.js'
import type { ExtractedSQLBlock } from '../src/extractors/sql-extractor.js'

describe('LogicClassifier', () => {
  const classifier = new LogicClassifier({ useAmpForAmbiguous: false })

  const createMockFunction = (overrides: Partial<ExtractedFunction>): ExtractedFunction => ({
    name: 'test_function',
    filePath: 'test.py',
    startLine: 1,
    endLine: 5,
    signature: 'def test_function()',
    parameters: [],
    returnType: null,
    docstring: null,
    businessRuleMarkers: [],
    sourceCode: 'def test_function(): pass',
    decorators: [],
    ...overrides
  })

  const createMockSQLBlock = (overrides: Partial<ExtractedSQLBlock>): ExtractedSQLBlock => ({
    name: 'test_query',
    filePath: 'test.sql',
    startLine: 1,
    endLine: 5,
    sqlType: 'query',
    description: null,
    businessRuleMarkers: [],
    sourceCode: 'SELECT * FROM test',
    tables: ['test'],
    columns: [],
    ...overrides
  })

  describe('classifyFunction', () => {
    it('should classify functions with BUSINESS_RULE markers as business_logic', async () => {
      const func = createMockFunction({
        name: 'some_function',
        businessRuleMarkers: ['Maximum order limit is 100']
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult.classification).toBe('business_logic')
      expect(result.classificationResult.confidence).toBe('high')
    })

    it('should classify threshold calculations as business_logic', async () => {
      const func = createMockFunction({
        name: 'calculate_threshold',
        sourceCode: `
def calculate_threshold(value):
    if value > THRESHOLD_LIMIT:
        return "exceeded"
    return "ok"
`
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult.classification).toBe('business_logic')
    })

    it('should classify RAG status functions as business_logic', async () => {
      const func = createMockFunction({
        name: 'get_rag_status',
        docstring: 'Calculate RAG status based on performance metrics'
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult.classification).toBe('business_logic')
    })

    it('should classify data loading functions as pipeline_code', async () => {
      const func = createMockFunction({
        name: 'load_customer_data',
        sourceCode: `
def load_customer_data(path):
    return spark.read.parquet(path)
`
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult.classification).toBe('pipeline_code')
    })

    it('should classify save functions as pipeline_code', async () => {
      const func = createMockFunction({
        name: 'save_results',
        sourceCode: `
def save_results(df, path):
    df.write.mode("overwrite").parquet(path)
`
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult.classification).toBe('pipeline_code')
    })

    it('should classify setup/init functions as pipeline_code', async () => {
      const func = createMockFunction({
        name: 'setup_spark_session',
        sourceCode: `
def setup_spark_session():
    return SparkSession.builder.getOrCreate()
`
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult.classification).toBe('pipeline_code')
    })

    it('should classify validation functions as business_logic', async () => {
      const func = createMockFunction({
        name: 'validate_order',
        docstring: 'Validate order against business rules'
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult.classification).toBe('business_logic')
    })

    it('should handle functions with mixed signals', async () => {
      const func = createMockFunction({
        name: 'process_and_validate',
        sourceCode: `
def process_and_validate(df):
    # Load and validate
    threshold = 100
    return df.filter(df.value > threshold)
`
      })

      const result = await classifier.classifyFunction(func)
      
      expect(result.classificationResult).toBeDefined()
      expect(['business_logic', 'pipeline_code']).toContain(result.classificationResult.classification)
    })
  })

  describe('classifySQLBlock', () => {
    it('should classify SQL with BUSINESS_RULE as business_logic', async () => {
      const block = createMockSQLBlock({
        businessRuleMarkers: ['Orders over $1000 require approval']
      })

      const result = await classifier.classifySQLBlock(block)
      
      expect(result.classificationResult.classification).toBe('business_logic')
      expect(result.classificationResult.confidence).toBe('high')
    })

    it('should classify threshold queries as business_logic', async () => {
      const block = createMockSQLBlock({
        name: 'threshold_violations',
        sourceCode: `
SELECT * FROM orders
WHERE total > THRESHOLD_LIMIT
`
      })

      const result = await classifier.classifySQLBlock(block)
      
      expect(result.classificationResult.classification).toBe('business_logic')
    })

    it('should classify data extraction queries as pipeline_code', async () => {
      const block = createMockSQLBlock({
        name: 'extract_orders',
        sourceCode: 'SELECT * FROM orders'
      })

      const result = await classifier.classifySQLBlock(block)
      
      expect(result.classificationResult.classification).toBe('pipeline_code')
    })
  })

  describe('batch classification', () => {
    it('should classify multiple functions', async () => {
      const functions = [
        createMockFunction({ name: 'load_data', sourceCode: 'spark.read.parquet(path)' }),
        createMockFunction({ name: 'calculate_threshold', businessRuleMarkers: ['Max limit'] })
      ]

      const results = await classifier.classifyFunctions(functions)
      
      expect(results).toHaveLength(2)
      expect(results[0].classificationResult.classification).toBe('pipeline_code')
      expect(results[1].classificationResult.classification).toBe('business_logic')
    })
  })
})
