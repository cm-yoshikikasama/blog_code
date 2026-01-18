# Integration Test Template

After user executes jobs (Step Functions, Glue, Lambda, EventBridge, etc.), retrieve results via aws-mcp-server skill and record evidence.

Copy this template and save as `(project)/docs/test-evidence.md`

## Header Information

```text
# Integration Test Evidence

Project: (Project name)
Environment: dev / stg / prod
Region: ap-northeast-1
```

## Test Case List

Adjust columns based on project

| No | Test Case Name | Category | Test Overview | Prerequisites | Input Data | Expected Results | Processing Time | Result | Date | Assignee | Notes | Re-execution Result | Date | Assignee |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | (Test name) | Normal | (Overview) | (Prerequisites) | (Input) | (Expected results) | X min | OK | YYYY/MM/DD | (Assignee) | - | - | - | - |
| 2 | (Test name) | Normal | (Overview) | (Prerequisites) | (Input) | (Expected results) | X min | OK | YYYY/MM/DD | (Assignee) | - | - | - | - |
| 3 | (Test name) | Error | (Overview) | (Prerequisites) | (Input) | (Expected results) | - | OK | YYYY/MM/DD | (Assignee) | - | - | - | - |

### Test Case Examples

Example of adding columns for multiple jobs (sample-etl-pipeline scenario)

| No | Test Case Name | Category | Test Overview | Prerequisites | Input Data | Expected Results | main-sfn | data-export-sfn | data-transform-sfn | Result | Date | Assignee | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sample-etl-pipeline schedule execution | Normal | Execute sample-dev-etl-main-workflow via EventBridge Scheduler. Data stored in S3, only parquet files in target S3Path. | EventBridge Scheduler configured | Full DB data at execution time | main-sfn succeeds, execution time within 40 min. data-export-sfn succeeds, execution time within 20 min. data-transform-sfn succeeds. Table counts match, no diff. | 14 min | 12 min | 2 min | OK | 2025/01/15 | Alice | - |
| 2 | sample-etl-pipeline manual execution | Normal | Manually execute sample-dev-etl-main-workflow with arguments. {"time": "2025-01-15T04:35:00Z"} | After No.1 manual execution | Full DB data at execution time | main-sfn succeeds. Table counts match. | 14 min | 12 min | 2 min | OK | 2025/01/15 | Alice | - |
| 3 | DataTransformFunction failure notification | Error | Start with DataTransformFunction in failure state, verify error notification sent via SNS. | Temporarily add invalid string to SQL | Full DB data at execution time | main-sfn fails. data-transform-sfn fails. SNS sent via CloudWatch alarm, received in Slack. | - | - | - | OK | 2025/01/15 | Alice | - |

---

## No.1 Evidence Details

### No.1 Prerequisites

- (Prerequisite 1)
- (Prerequisite 2)

### No.1 Execution Results

Record evidence for each expected result

#### Expected Result 1

- (Expected result content)

Processing Time: XX min

```text
# Execute via aws-mcp-server skill
$ pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws <service> <command> --args..."}'
(Output result)
```

#### Data Validation (if applicable)

Record queries based on validation content

##### Count Verification

```sql
SELECT COUNT(*) FROM db_name.table_name
```

| count |
| ----- |
| 12345 |

##### Diff Comparison Between 2 Tables

When verifying count match and data diff between two tables

Count Comparison

```sql
SELECT 'table_a', COUNT(*) FROM db_name.table_a
UNION ALL
SELECT 'table_b', COUNT(*) FROM db_name.table_b
```

| table   | count |
| ------- | ----- |
| table_a | 12345 |
| table_b | 12345 |

Diff Check (detect bidirectional diff with EXCEPT clause)

```sql
SELECT 'a_only' as difference_type, *
FROM db_name.table_a
EXCEPT
SELECT 'a_only', *
FROM db_name.table_b

UNION ALL

SELECT 'b_only' as difference_type, *
FROM db_name.table_b
EXCEPT
SELECT 'b_only', *
FROM db_name.table_a
```

Result: No diff

---

## No.2 Evidence Details

### No.2 Prerequisites

- (Prerequisites)

### No.2 User Execution Operations

(Record execution method for manual execution)

### No.2 Execution Results

(Record evidence)

---

## No.3 Evidence Details (Error)

### No.3 Prerequisites

- (Conditions to cause error)

### No.3 Execution Results

#### No.3 Job Execution Result (Failure)

- Job should fail and terminate

```text
# Execute via aws-mcp-server skill
$ pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws stepfunctions describe-execution --execution-arn ..."}'
(Failure result)
```

#### No.3 Error Notification

- Error notification should be sent

- SNS delivery verified: Confirmed
- Chatbot received: Confirmed

---

## Usage

1. Copy this template and save as `docs/test-evidence.md`
2. Adjust test case list columns based on project
3. Create evidence detail section for each test case
4. After user executes job, retrieve results with read-only commands and record
5. Record Athena query results in table format for data validation
