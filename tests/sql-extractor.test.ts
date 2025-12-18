import { describe, it, expect, beforeAll } from 'vitest'
import { SQLExtractor } from '../src/extractors/sql-extractor.js'

describe('SQLExtractor', () => {
  const extractor = new SQLExtractor()

  beforeAll(async () => {
    await extractor.initialize()
  })

  describe('extractFromSource', () => {
    it('should extract a simple SELECT query', async () => {
      const source = `
-- name: get_active_orders
-- Retrieve all active orders from the system
SELECT order_id, customer_id, total_amount
FROM orders
WHERE status = 'active';
`
      const blocks = await extractor.extractFromSource(source)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].name).toBe('get_active_orders')
      expect(blocks[0].sqlType).toBe('query')
      expect(blocks[0].tables).toContain('orders')
    })

    it('should extract BUSINESS_RULE markers from SQL comments', async () => {
      const source = `
-- Calculate order threshold violations
-- BUSINESS_RULE: Orders exceeding $10,000 require approval
SELECT order_id, total_amount
FROM orders
WHERE total_amount > 10000;
`
      const blocks = await extractor.extractFromSource(source)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].businessRuleMarkers).toHaveLength(1)
      expect(blocks[0].businessRuleMarkers[0]).toContain('$10,000')
    })

    it('should identify CREATE PROCEDURE statements', async () => {
      const source = `
CREATE OR REPLACE PROCEDURE update_order_status(
    p_order_id INT,
    p_new_status VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE orders SET status = p_new_status WHERE order_id = p_order_id;
END;
$$;
`
      const blocks = await extractor.extractFromSource(source)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].sqlType).toBe('procedure')
      expect(blocks[0].name).toBe('update_order_status')
    })

    it('should identify CREATE VIEW statements', async () => {
      const source = `
CREATE VIEW active_customers AS
SELECT customer_id, name, email
FROM customers
WHERE is_active = true;
`
      const blocks = await extractor.extractFromSource(source)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].sqlType).toBe('view')
      expect(blocks[0].name).toBe('active_customers')
    })

    it('should extract tables from JOIN statements', async () => {
      const source = `
SELECT o.order_id, c.name, p.product_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;
`
      const blocks = await extractor.extractFromSource(source)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].tables).toContain('orders')
      expect(blocks[0].tables).toContain('customers')
      expect(blocks[0].tables).toContain('order_items')
      expect(blocks[0].tables).toContain('products')
    })

    it('should handle multiple statements', async () => {
      const source = `
-- First query
SELECT * FROM users;

-- Second query
SELECT * FROM orders;
`
      const blocks = await extractor.extractFromSource(source)
      
      expect(blocks).toHaveLength(2)
    })

    it('should extract CTE names', async () => {
      const source = `
WITH monthly_totals AS (
    SELECT month, SUM(amount) as total
    FROM transactions
    GROUP BY month
)
SELECT * FROM monthly_totals;
`
      const blocks = await extractor.extractFromSource(source)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].name).toBe('cte_monthly_totals')
    })
  })
})
