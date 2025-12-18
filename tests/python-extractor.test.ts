import { describe, it, expect } from 'vitest'
import { PythonExtractor } from '../src/extractors/python-extractor.js'

describe('PythonExtractor', () => {
  const extractor = new PythonExtractor()

  describe('extractFromSource', () => {
    it('should extract a simple function', () => {
      const source = `
def calculate_total(a: int, b: int) -> int:
    """Calculate the sum of two numbers."""
    return a + b
`
      const functions = extractor.extractFromSource(source)
      
      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('calculate_total')
      expect(functions[0].parameters).toHaveLength(2)
      expect(functions[0].parameters[0]).toEqual({ name: 'a', type: 'int', default: null })
      expect(functions[0].parameters[1]).toEqual({ name: 'b', type: 'int', default: null })
      expect(functions[0].returnType).toBe('int')
      expect(functions[0].docstring).toBe('Calculate the sum of two numbers.')
    })

    it('should extract BUSINESS_RULE markers from docstrings', () => {
      const source = `
def calculate_rag_status(current: float, previous: float) -> str:
    """
    Calculate RAG status for orders.
    
    BUSINESS_RULE: RED if increase >= 50%
    BUSINESS_RULE: AMBER if increase 30-49%
    BUSINESS_RULE: GREEN if increase < 30%
    """
    increase = (current - previous) / previous * 100
    if increase >= 50:
        return "RED"
    elif increase >= 30:
        return "AMBER"
    return "GREEN"
`
      const functions = extractor.extractFromSource(source)
      
      expect(functions).toHaveLength(1)
      expect(functions[0].businessRuleMarkers).toHaveLength(3)
      expect(functions[0].businessRuleMarkers[0]).toContain('RED')
      expect(functions[0].businessRuleMarkers[1]).toContain('AMBER')
      expect(functions[0].businessRuleMarkers[2]).toContain('GREEN')
    })

    it('should extract functions with default parameters', () => {
      const source = `
def process_data(threshold: float = 0.5, max_retries: int = 3):
    pass
`
      const functions = extractor.extractFromSource(source)
      
      expect(functions).toHaveLength(1)
      expect(functions[0].parameters).toHaveLength(2)
      expect(functions[0].parameters[0]).toEqual({ name: 'threshold', type: 'float', default: '0.5' })
      expect(functions[0].parameters[1]).toEqual({ name: 'max_retries', type: 'int', default: '3' })
    })

    it('should extract class methods', () => {
      const source = `
class OrderProcessor:
    def validate_order(self, order_id: str) -> bool:
        """Validate order existence."""
        return True
    
    def calculate_total(self, items: list) -> float:
        """Calculate order total."""
        return sum(items)
`
      const functions = extractor.extractFromSource(source)
      
      expect(functions).toHaveLength(2)
      expect(functions[0].name).toBe('validate_order')
      expect(functions[0].parameters).toHaveLength(1)
      expect(functions[0].parameters[0].name).toBe('order_id')
      expect(functions[1].name).toBe('calculate_total')
    })

    it('should extract async functions', () => {
      const source = `
async def fetch_data(url: str) -> dict:
    """Fetch data from API."""
    return {}
`
      const functions = extractor.extractFromSource(source)
      
      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('fetch_data')
    })

    it('should handle functions without docstrings', () => {
      const source = `
def simple_function():
    return 42
`
      const functions = extractor.extractFromSource(source)
      
      expect(functions).toHaveLength(1)
      expect(functions[0].docstring).toBeNull()
    })

    it('should extract BUSINESS_RULE from comments in code', () => {
      const source = `
def check_limit(value: int) -> bool:
    # BUSINESS_RULE: Maximum allowed value is 1000
    MAX_LIMIT = 1000
    return value <= MAX_LIMIT
`
      const functions = extractor.extractFromSource(source)
      
      expect(functions).toHaveLength(1)
      expect(functions[0].businessRuleMarkers).toHaveLength(1)
      expect(functions[0].businessRuleMarkers[0]).toContain('Maximum allowed value')
    })
  })
})
