# Business Logic Documentation Index

Auto-generated documentation extracted from source code.

**Generated:** 2025-12-22T13:11:51.123Z

## Overview

| Category | Python Functions | SQL Blocks |
|----------|------------------|------------|
| [Business Logic](./business-logic/) | 22 | 10 |
| [Pipeline Code](./pipeline-code/) | 6 | 1 |
| **Total** | **28** | **11** |

## Quick Links

### Business Logic

- [`sample_accounts`](./business-logic/..-source-code-tests-test_rag_calculator.md#sample_accounts) - Create sample accounts DataFrame.
- [`test_red_status_50_percent_increase`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_red_status_50_percent_increase) - Test that 50%+ increase results in RED status.
- [`test_amber_status_35_percent_increase`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_amber_status_35_percent_increase) - Test that 30-49% increase results in AMBER status.
- [`test_green_status_20_percent_increase`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_green_status_20_percent_increase) - Test that <30% increase results in GREEN status.
- [`test_green_status_new_customer_no_previous_month`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_green_status_new_customer_no_previous_month) - Test that new customers with no previous month data get GREEN status.
- [`test_order_limit_exceeded`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_order_limit_exceeded) - Test that exceeding order limit is flagged.
- [`test_order_limit_not_exceeded`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_order_limit_not_exceeded) - Test that staying within order limit is not flagged.
- [`test_exactly_30_percent_is_amber`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_exactly_30_percent_is_amber) - Test that exactly 30% increase results in AMBER (boundary case).
- [`test_exactly_50_percent_is_red`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_exactly_50_percent_is_red) - Test that exactly 50% increase results in RED (boundary case).
- [`test_decrease_in_orders_is_green`](./business-logic/..-source-code-tests-test_rag_calculator.md#test_decrease_in_orders_is_green) - Test that a decrease in orders results in GREEN status.
- ... and 12 more

### Pipeline Code

- [`spark`](./pipeline-code/..-source-code-tests-test_rag_calculator.md#spark) - Create a SparkSession for testing.
- [`sample_orders_same_month`](./pipeline-code/..-source-code-tests-test_rag_calculator.md#sample_orders_same_month) - Create orders all in the same month for testing.
- [`sample_orders_two_months`](./pipeline-code/..-source-code-tests-test_rag_calculator.md#sample_orders_two_months) - Create orders spanning two months for MoM comparison.
- [`test_monthly_totals_calculation`](./pipeline-code/..-source-code-tests-test_rag_calculator.md#test_monthly_totals_calculation) - Test that monthly totals are calculated correctly.
- [`__init__`](./pipeline-code/..-source-code-src-pyspark-rag_calculator.md#__init__) - Initialize the RAG calculator with a Spark session.
- [`__init__`](./pipeline-code/..-source-code-src-pyspark-customer_orders_pipeline.md#__init__) - Initialize the pipeline with a Spark session.
