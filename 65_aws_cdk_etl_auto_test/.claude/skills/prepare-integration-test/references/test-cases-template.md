# Integration Test Template

Execute jobs (Step Functions, Glue, Lambda, EventBridge, etc.), retrieve
results via AWS CLI, and record evidence.

## Output File Structure

```text
(project)/test-outputs/
  test-plan.md              # Test plan (test case list + data management + summary)
  evidences/
    01-<test-name>.md       # Evidence per test case
    01-<test-name>-retest.md  # Evidence for retest (only when needed)
    02-<test-name>.md
    ...
```

test-plan.md contains the test plan and summary. Detailed evidence for each
test case is stored under `evidences/`. For retests, create a separate file
with the `-retest` suffix.

---

## Test Data Management

In ETL pipelines, source data changes after processing, which can cause
data-not-found issues on retest. Consider the following when creating test
cases.

### Common Patterns of Data Loss

| Pattern       | Description                            | Example                                     |
| ------------- | -------------------------------------- | ------------------------------------------- |
| Archive move  | Move processed files to another path   | `s3://bucket/raw/` → `s3://bucket/archive/` |
| Deletion      | Delete processed files                 | Lambda deletes source file                  |
| Status update | Update the processing flag on a record | Change to `is_processed = true`             |

### Data Preparation Checklist per Test Case

Clearly state the following in the "Prerequisites" section of each test case

- Command to confirm source data exists (S3 path, table row count, etc.)
- Restore procedure if data has been lost (copy source path, SQL, etc.)
- Steps to clear side effects from the previous run (delete archive, reset
  flags, etc.)

### Data Restore Command Examples

Restore S3 data

```text
# Copy from archive back to source path
$ aws s3 cp s3://bucket/archive/file.csv s3://bucket/raw/file.csv --profile ${AWS_PROFILE}

# Bulk copy of all objects under a specific prefix
$ aws s3 cp s3://bucket/archive/2025/01/ s3://bucket/raw/2025/01/ --recursive --profile ${AWS_PROFILE}
```

## Test Classification Guide

The following shows test case classifications and representative test
perspectives for each. Classifications that do not apply to the project
should be marked as "Not applicable" in the test case list.

| Classification         | Test perspectives                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Normal case            | First run, re-run (idempotency), incremental run                                                  |
| Error case             | Source data absent, invalid format, missing output destination, insufficient permissions, timeout |
| Boundary value         | Empty data (0 records), large data volume, special characters (NULL, empty string, multi-byte)    |
| Concurrency/contention | Concurrent writes to the same table, concurrent processing of the same source                     |

## ETL Verification Checklist

Perspectives to verify in the evidence for each test case

- Confirmation of input data (content of source files/tables)
- Record count and content of output data (comparison with expected values)
- Accuracy of data transformations (type casting, calculations, filter
  conditions)
- Metadata verification (schema, partitions, table properties)
- Side effect verification (archive/deletion of source data, status updates)
- Log verification (no errors, record count matches)

---

## test-plan.md Template

Create `(project)/test-outputs/test-plan.md` with the following structure.

### Header

```text
# Integration Test Plan

Project: (project name)
Environment: dev / stg / prod
Region: ap-northeast-1
```

### Test Data Management Table

List of data used in tests

| File name   | Record count | Location            | Notes                |
| ----------- | ------------ | ------------------- | -------------------- |
| (file name) | X records    | `s3://bucket/path/` | (supplementary note) |

### Test Case List

| No  | Test case name | Classification | Overview   | Expected result              | Result | Date | Result (retest) | Date (retest) |
| --- | -------------- | -------------- | ---------- | ---------------------------- | ------ | ---- | --------------- | ------------- |
| 1   | (test name)    | Normal case    | (overview) | (summary of expected result) | -      | -    | -               | -             |
| 2   | (test name)    | Normal case    | (overview) | (summary of expected result) | -      | -    | -               | -             |
| 3   | (test name)    | Error case     | (overview) | (summary of expected result) | -      | -    | -               | -             |

Column descriptions

- Expected result: Describe expected values per key (format:
  "12/01=3 records, 12/02=2 records")
- Result / Date: The check step in Phase 2 records OK/NG and the execution
  date
- Result (retest) / Date (retest): Retest result after a fix. Leave as "-"
  if no retest is performed

### Summary

Place a summary section below the test case list to be filled in after all
tests are complete. The summary step in Phase 2 will populate this section.

```text
## Summary

(Filled in by the summary step after all tests are complete)
```

Content to include

- Test result summary (Total X: OK X / NG X)
- Issues and findings detected
- Improvement suggestions (code fixes, additional tests, etc.)

Test case example (when there are multiple jobs)

| No  | Test case name      | Classification | Overview                           | Expected result                     | main-sfn | export-sfn | Result | Date       | Result (retest) | Date (retest) |
| --- | ------------------- | -------------- | ---------------------------------- | ----------------------------------- | -------- | ---------- | ------ | ---------- | --------------- | ------------- |
| 1   | Scheduled execution | Normal case    | Triggered by EventBridge Scheduler | Table record count matches, no diff | 14 min   | 12 min     | OK     | 2025/01/15 | -               | -             |

When recording execution time for multiple jobs, add a column per job.

---

## Evidence File Template

For each test case, create
`(project)/test-outputs/evidences/XX-<test-name>.md`.
XX is a zero-padded 2-digit number; test-name is an English slug.
For retests, create a separate file as `XX-<test-name>-retest.md`.

### Header

```text
# No.X (Test name)
```

Metadata (classification, result, execution date/time, processing time) is
consolidated in the test case list in test-plan.md. Do not include it in the
evidence file.

### Prerequisites

```text
## Prerequisites

- (Prerequisite 1)
- (Prerequisite 2)
```

### Data Preparation

```text
## Data Preparation

- Source data check: (command to confirm existence)
- Restore procedure: (restore command if data has been lost)
- Clear side effects: (delete archive from previous run, reset flags, etc.)
```

### Check Items Table

```text
## Check Items

| # | Check item | Expected value | Actual value | Judgment |
| --- | --- | --- | --- | --- |
| 1 | Job execution status | SUCCEEDED | - | - |
| 2 | Record count (12/01) | 3 records | - | - |
| 3 | Source file deletion | Confirmed | - | - |
| 4 | Archive creation | Confirmed | - | - |
```

The check step in Phase 2 updates the "Actual value" and "Judgment" columns.

### Evidence Sections

Create a subsection corresponding to each number in the check items table.
Linking by number makes the basis for each check item immediately clear. Use
commands appropriate to the type of job.

Service-specific status check commands

| Service              | Execution command               | Status check command                                | Polling            |
| -------------------- | ------------------------------- | --------------------------------------------------- | ------------------ |
| Step Functions       | `start-execution`               | `describe-execution --execution-arn <ARN>`          | Required (RUNNING) |
| Glue                 | `start-job-run`                 | `get-job-run --job-name <NAME> --run-id <ID>`       | Required (RUNNING) |
| Lambda (synchronous) | `invoke --function-name <NAME>` | Not required (determined immediately from response) | Not required       |

Recording example (Step Functions)

```text
## Evidence

### #1 Job execution status

$ aws stepfunctions describe-execution --execution-arn <ARN> --profile ${AWS_PROFILE} --output json
{
  "status": "SUCCEEDED",
  "startDate": "2025-01-15T10:00:00+09:00",
  "stopDate": "2025-01-15T10:00:04+09:00"
}

### #2 Record count

SELECT target_date, COUNT(*) as cnt FROM db_name.table_name GROUP BY target_date

| target_date | cnt |
| --- | --- |
| 2025-12-01 | 3 |
| 2025-12-02 | 2 |

### #3 Source file deletion

$ aws s3 ls s3://bucket/data/ --profile ${AWS_PROFILE}
(empty = deleted)

### #4 Archive creation

$ aws s3 ls s3://bucket/archive/2025/01/15/ --profile ${AWS_PROFILE}
2025-01-15 10:00:04  12345 file.csv
```

Recording example when diff comparison is needed

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

Recording example (Glue)

```text
### #1 Job execution status

$ aws glue get-job-run --job-name <JOB_NAME> --run-id <RUN_ID> --profile ${AWS_PROFILE} --output json
{
  "JobRun": {
    "JobRunState": "SUCCEEDED",
    "StartedOn": "2025-01-15T10:00:00+09:00",
    "CompletedOn": "2025-01-15T10:05:00+09:00",
    "ExecutionTime": 300
  }
}
```

Recording example (Lambda synchronous)

```text
### #1 Lambda execution result

$ aws lambda invoke --function-name <FUNC_NAME> --payload '{"key":"value"}' /tmp/response.json --profile ${AWS_PROFILE} --output json
{
  "StatusCode": 200,
  "ExecutedVersion": "$LATEST"
}

$ cat /tmp/response.json
{"statusCode": 200, "body": {"rows_inserted": 3}}
```

### Recording Example for Error Case Evidence

Organize sections according to the check items for error case test cases

```text
### #1 Job execution status (failure)

$ aws <service> <describe-command> --<id-param> <ID> --profile ${AWS_PROFILE} --output json
{
  "status": "FAILED",
  "error": "...",
  "cause": "..."
}

### #2 Error notification

- SNS alert confirmed: Done
- Chatbot received: Done
```
