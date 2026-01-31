# Business Logic Documentation Index

Auto-generated documentation extracted from source code.

**Generated:** 2026-01-31T03:58:46.287Z

## Overview

| Category | Python Functions | SQL Blocks |
|----------|------------------|------------|
| [Business Logic](./business-logic/) | 21 | 14 |
| [Pipeline Code](./pipeline-code/) | 5 | 1 |
| **Total** | **26** | **15** |

## Quick Links

### Business Logic

- [`sample_accounts`](./business-logic/..-source-code-tests-test_rag_calculator.md#sample_accounts) - Create sample accounts DataFrame.
- [`test_valid_records_go_to_result_table`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_valid_records_go_to_result_table) - Test that valid records go to result_table, not holding_table.
- [`test_missing_customer_name_routed_to_holding`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_missing_customer_name_routed_to_holding) - Test that records with missing customer_name go to holding_table.
- [`test_missing_order_limit_routed_to_holding`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_missing_order_limit_routed_to_holding) - Test that records with missing order_limit go to holding_table.
- [`test_holding_table_has_hold_timestamp`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_holding_table_has_hold_timestamp) - Test that holding_table records include hold_timestamp.
- [`test_result_table_has_expected_columns`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_result_table_has_expected_columns) - Test that result_table has all expected columns.
- [`test_holding_table_has_expected_columns`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_holding_table_has_expected_columns) - Test that holding_table has all expected columns.
- [`test_mixed_valid_and_invalid_records`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_mixed_valid_and_invalid_records) - Test that valid and invalid records are correctly split.
- [`calculate_monthly_totals`](./business-logic/..-source-code-src-pyspark-rag_calculator.md#calculate_monthly_totals) - Calculate monthly order totals per account.
- [`enrich_with_account_data`](./business-logic/..-source-code-src-pyspark-rag_calculator.md#enrich_with_account_data) - Enrich monthly totals with account information.
- ... and 11 more

### Pipeline Code

- [`spark`](./pipeline-code/..-source-code-tests-test_rag_calculator.md#spark) - Create a SparkSession for testing.
- [`sample_orders`](./pipeline-code/..-source-code-tests-test_rag_calculator.md#sample_orders) - Create sample orders DataFrame.
- [`test_monthly_totals_calculation`](./pipeline-code/..-source-code-tests-test_rag_calculator.md#test_monthly_totals_calculation) - Test that monthly totals are calculated correctly.
- [`__init__`](./pipeline-code/..-source-code-src-pyspark-rag_calculator.md#__init__) - Initialize the validator with a Spark session.
- [`__init__`](./pipeline-code/..-source-code-src-pyspark-customer_orders_pipeline.md#__init__) - Initialize the pipeline with a Spark session.
