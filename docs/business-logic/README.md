# Business Logic Documentation

This directory contains auto-generated documentation for business logic functions.

## Summary
- **Python Functions:** 22
- **SQL Blocks:** 10

## Python Functions

### [test_rag_calculator.py](./..-source-code-tests-test_rag_calculator.md)
- `sample_accounts`
- `test_red_status_50_percent_increase`
- `test_amber_status_35_percent_increase`
- `test_green_status_20_percent_increase`
- `test_green_status_new_customer_no_previous_month`
- `test_order_limit_exceeded`
- `test_order_limit_not_exceeded`
- `test_exactly_30_percent_is_amber`
- `test_exactly_50_percent_is_red`
- `test_decrease_in_orders_is_green`

### [rag_calculator.py](./..-source-code-src-pyspark-rag_calculator.md)
- `calculate_monthly_totals`
- `calculate_month_over_month_change`
- `determine_rag_status`
- `check_order_limit`
- `calculate_rag`

### [customer_orders_pipeline.py](./..-source-code-src-pyspark-customer_orders_pipeline.md)
- `load_accounts`
- `load_orders`
- `load_transactions`
- `join_orders_with_transactions`
- `create_customer_order_summary`
- `run_rag_analysis`
- `get_risk_summary`

## SQL

### [rag_calculation.sql](./..-source-code-src-sql-rag_calculation.md)
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
