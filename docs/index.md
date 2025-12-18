# Business Logic Documentation Index

This directory contains auto-generated documentation extracted from the source code repository.

## Structure

- **[business-logic/](./business-logic/)** - Functions and SQL implementing business rules, thresholds, and domain logic
- **[pipeline-code/](./pipeline-code/)** - Data loading, transformation, and infrastructure code

## How It Works

Documentation is automatically extracted using tree-sitter parsing when:
1. Changes are pushed to the source-code repository (via webhook)
2. The scheduled daily sync runs
3. Manual extraction is triggered

## Marking Business Logic

To ensure your code is correctly classified, use `BUSINESS_RULE` markers:

```python
def calculate_rag_status(current: float, previous: float) -> str:
    """
    Calculate RAG status for order monitoring.
    
    BUSINESS_RULE: RED if month-over-month increase >= 50%
    BUSINESS_RULE: AMBER if increase between 30-49%
    BUSINESS_RULE: GREEN if increase < 30%
    """
    increase = ((current - previous) / previous) * 100
    
    if increase >= 50:
        return "RED"
    elif increase >= 30:
        return "AMBER"
    return "GREEN"
```

```sql
-- BUSINESS_RULE: Orders exceeding $10,000 require manager approval
SELECT order_id, total_amount
FROM orders
WHERE total_amount > 10000
  AND approval_status IS NULL;
```

## Last Updated

This index was auto-generated. See individual documentation files for last update timestamps.
