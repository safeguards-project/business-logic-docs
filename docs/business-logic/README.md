# Business Logic Documentation

This directory contains auto-generated documentation for business logic functions.

## Summary
- **Python Functions:** 21
- **SQL Blocks:** 14

## Python Functions

### [test_rag_calculator.py](./..-source-code-tests-test_rag_calculator.md)
- `sample_accounts`
- `test_valid_records_go_to_result_table`
- `test_missing_customer_name_routed_to_holding`
- `test_missing_order_limit_routed_to_holding`
- `test_holding_table_has_hold_timestamp`
- `test_result_table_has_expected_columns`
- `test_holding_table_has_expected_columns`
- `test_mixed_valid_and_invalid_records`

### [rag_calculator.py](./..-source-code-src-pyspark-rag_calculator.md)
- `calculate_monthly_totals`
- `enrich_with_account_data`
- `apply_validation_rules`
- `split_by_validation`
- `validate_orders`
- `calculate_customer_risk_score`

### [customer_orders_pipeline.py](./..-source-code-src-pyspark-customer_orders_pipeline.md)
- `load_accounts`
- `load_orders`
- `load_transactions`
- `join_orders_with_transactions`
- `run_pipeline`
- `get_result_summary`
- `get_holding_summary`

## SQL

### [rag_calculation.sql](./..-source-code-src-sql-rag_calculation.md)
- `unnamed_query` (query)
- `cte_valid_orders` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)

### [customer_orders_pipeline.sql](./..-source-code-src-sql-customer_orders_pipeline.md)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
- `unnamed_query` (query)
