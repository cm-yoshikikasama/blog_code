# Integration Test Preparation

Creates a test plan document, verifies prerequisites, prepares test data,
and generates a workflow.json for the `/run-integration-test` skill.

## General Rules

- After every AskUserQuestion call, verify that the response contains actual
  answers (the `=` sign). If empty, switch to text fallback: output all
  questions as a numbered list in plain text and ask the user to reply
  directly. Do not retry AskUserQuestion.
- STRICTLY PROHIBITED: assuming default values under any circumstances.
- workflow.json prompt fields must never contain `$()` command
  substitution patterns. `--permission-mode dontAsk` flags `$()` as dangerous
  and prompts for confirmation, breaking automated execution. Instead,
  instruct separate sequential Bash tool calls in the prompt.

## Prerequisites

- The CDK stack must be deployed
- The IAM role for the AWS profile to be used must have the required
  permissions

## Workflow Overview

This skill handles test preparation. Test execution is performed by the
`/run-integration-test` skill in a separate `--permission-mode dontAsk` session.

### Initial Test

1. Test preparation (Steps 1-6) via this skill
2. Test execution via `/run-integration-test` in a separate session

### Retest (when issues are detected in the summary)

1. User fixes the code
2. Retest preparation (Steps R1-R3) via this skill
3. Test execution via `/run-integration-test` in a separate session

### Mode Detection

At skill startup, check the state of `(project)/test-outputs/test-plan.md` to
determine the execution mode.

- test-plan.md does not exist, or has no "Summary" section → Initial test
  (Steps 1-6)
- test-plan.md has a "Summary" section → Retest preparation (Steps R1-R3)

## Initial Test Execution Steps

### Step 1: Pre-interview

Before generating files, confirm the test conditions.

1. Read the design document (`(project)/docs/design.md`) and CDK code
   (`(project)/cdk/lib/`) to understand the testable scope
2. Run `grep '\[profile' ~/.aws/config` to get the list of profiles
3. Use AskUserQuestion to confirm the following
   - AWS profile to use (select from the retrieved list)
   - Test scope (normal cases only / including error cases / including
     boundary values)
   - Any additional test perspectives (if any)
   - Polling interval for async job status checks (suggest based on the
     expected job execution time; default 60 seconds, maximum 900 seconds /
     15 minutes due to BASH_MAX_TIMEOUT_MS). This value is saved as
     `poll_interval_seconds` in workflow.json

### Step 2: Create the Test Plan Document

Create `(project)/test-outputs/test-plan.md` reflecting the results from the Step 1
interview. Do not create evidence files at this point.

1. Follow the test-plan.md template in
   [test-cases-template.md](test-cases-template.md) (also refer to the
   template for the test classification guide, ETL validation perspective
   checklist, and expected result description rules)
2. Define test cases according to the test scope confirmed in Step 1
3. Output to `(project)/test-outputs/test-plan.md`

### Step 3: Review the Test Plan Document

Present a summary of test-plan.md and obtain approval via AskUserQuestion.
Confirm completeness, expected result validity, and execution order
dependencies. General Rules (empty-response retry) apply.

If modifications are needed, update test-plan.md and review again via
AskUserQuestion. Since test-plan.md is a single file, the revision cost
is low.

### Step 4: Prerequisite Check and Test Data Preparation

Verify and prepare the following. If even one unrecoverable
issue is found, report it to the user and halt.

1. Authentication check
   - Verify with:
     `aws sts get-caller-identity --profile <profile-name>`
   - Failure → Report to user and halt

2. Infrastructure existence check
   - Verify that the resources identified from the CDK code exist
   - Execution targets: State Machine, Glue Job, Lambda Function, etc.
   - Data stores: S3 Bucket, Glue Database/Table, DynamoDB Table, etc.
   - Not found → Report to user that "CDK deployment is required" and halt

3. Check for existing data in the output table
   - Use an Athena query to check the row count and key distribution in the
     output table
   - If data exists, report to the user and ask whether to clean it up
     (confirmation is possible since this skill runs in interactive mode)
   - The cleanup method depends on the project's data strategy, so leave the
     decision to the user

4. Place test data
   - Check whether the CSV files used in the test cases exist in S3
   - For S3 object existence checks, use `list-objects-v2` with exact key
     matching instead of `head-object` (which returns exit code 254 on
     missing objects and breaks workflow execution):
     `aws s3api list-objects-v2 --bucket <bucket> --prefix <full-key> --query "Contents[?Key=='<full-key>']" --profile <profile>`
   - If not found, upload them from the project's `resources/data/`
   - Report the upload results to the user

5. Display a summary of check results to the user
   - Account ID, region, ARN/name of each resource
   - Existing row count in the output table
   - List of uploaded test data

### Step 5: Generate Evidence Files and workflow.json

Generate files only after the test plan has been approved and the
prerequisite checks are complete.

1. Follow the evidence file template in
   [test-cases-template.md](test-cases-template.md) and create a file for
   each test case
   - Output destination: `(project)/test-outputs/evidences/XX-<test-name>.md`
     (XX is zero-padded 2 digits; test-name is an English slug)
2. Auto-generate workflow.json

workflow.json generation rules

- For each test case, create the following two steps and set their
  dependencies
  - Execute step (`X-execute`): Launches the job
  - Check step (`X-check`): Verifies the execution result and records the
    evidence (depends_on: execute step)
- Add a summary step (`summary`) after all test cases (depends_on: all check
  steps)
- Since the prerequisite check is complete in this skill, do not include it
  in workflow.json
- In each step's `prompt` field, include the content from the "Step Prompt
  Templates" below
  - `X-execute` → "Job Execution" template
  - `X-check` → "Result Check and Evidence" template
  - `summary` → "Summary" template

workflow.json structure

```json
{
  "project": "(project-path)",
  "evidence_dir": "test-outputs/evidences/",
  "aws_profile": "(profile name confirmed in Step 1)",
  "poll_interval_seconds": 60,
  "config": {
    "max_retries": 1
  },
  "steps": [
    {
      "id": "1-execute",
      "name": "No.1 <test-name> Job Execution",
      "status": "pending",
      "retry": 0,
      "output": null,
      "prompt": "(content from step prompt template)"
    },
    {
      "id": "1-check",
      "name": "No.1 <test-name> Result Check",
      "status": "pending",
      "retry": 0,
      "output": null,
      "prompt": "(content from step prompt template)"
    },
    {
      "id": "summary",
      "name": "Summary",
      "status": "pending",
      "retry": 0,
      "output": null,
      "prompt": "(content from summary step prompt template)"
    }
  ]
}
```

Field descriptions

Top-level fields

- `aws_profile`: Profile name used with the AWS CLI (`--profile` flag)
- `poll_interval_seconds`: Wait interval in seconds between async job
  status checks (used for sleep during polling)

Step fields

- `id`: Unique identifier for the step (`<number>-execute` /
  `<number>-check` / `summary`). The execute/check pair can be inferred from
  the naming convention
- `retry`: Current retry count (initial value 0)
- `output`: Output value of the step (execution ARN, etc.; initial value
  null)
- `prompt`: Step-specific prompt used by `/run-integration-test`
- Steps are executed in the order of the array (the execute → check order is
  guaranteed by the naming convention)
- On retry, the `/run-integration-test` skill derives `<N>-execute` from `<N>-check` and
  resets the pair

### Step 6: Present the Next Steps

After generating workflow.json, inform the user in the following format.

```text
Test preparation is complete. To execute the tests, run the following in a separate terminal:

claude --permission-mode dontAsk

Then in that session, run:

/run-integration-test (project-path)

workflow.json: (absolute path to the generated workflow.json)
(aws_profile and poll_interval_seconds are recorded in workflow.json)

To resume after interruption, start a new --permission-mode dontAsk session and re-run /run-integration-test.
```

## Step Prompt Templates

When generating workflow.json, include the following content in each step's
`prompt` field.

### Job Execution

```text
Execute test case No.X "<test-name>".

Category: <normal/error/boundary>
Estimated duration: X minutes

Execution steps:
1. aws <service> <command> <args> --profile <aws_profile>

After execution, record the job identifier as output.
- Step Functions: executionArn
- Glue: RunId
- Lambda (synchronous): response JSON
```

### Result Check and Evidence

```text
Verify the result of test case No.X "<test-name>" and create the evidence.

1. Check status
   aws <service> <describe-command> --<id-param> {{X-execute.output}} --profile <aws_profile>

   For asynchronous jobs (Step Functions, Glue)
     If RUNNING → Report as job still running (re-check in the next iteration)
     If SUCCEEDED → Continue to evidence collection below
     If FAILED → Report as test failure
   For synchronous jobs (Lambda invoke)
     Since the result is finalized in the execute step, validate the response from output directly

2. Collect evidence
   Sequentially retrieve execution status (describe-execution, etc.) + S3 output (list-objects-v2) + CloudWatch Logs (filter-log-events)
   For S3 object checks, always use list-objects-v2 with --query exact match, never head-object (exit 254 on missing objects breaks workflow)
   For Athena queries, use separate Bash calls (never $() substitution):
     Call 1: aws athena start-query-execution ... --output text --query 'QueryExecutionId'
     Call 2: sleep 5
     Call 3: aws athena get-query-results --query-execution-id <id-from-call-1> ...
   For Iceberg date columns, use DATE literal syntax (DATE '2025-12-01') instead of string literals to avoid TYPE_MISMATCH errors

3. Record the evidence
   - Initial run: Record in <project-path>/test-outputs/evidences/XX-<test-name>.md
   - Retest: Create a new file <project-path>/test-outputs/evidences/XX-<test-name>-retest.md and record there
   - Update the "Actual Value" and "Verdict" columns in the checklist table
   - Record the commands and output in the evidence section
4. Update the test case list in <project-path>/test-outputs/test-plan.md
   - If the "Result" column is empty (-) → Update the "Result" and "Date" columns
   - If the "Result" column already has a value (retest) → Update the "Result (retest)" and "Date (retest)" columns
```

### Summary

```text
Aggregate the test results and write/update the summary section of test-plan.md.

Determine whether this is an initial run or a retest based on whether the summary section exists in test-plan.md.

(A) Initial run (summary section is empty)
1. Aggregate the "Result" column in the test case list
2. Read the checklist and evidence sections of each evidence file (XX-<test-name>.md)
3. Write to the "Summary" section of test-plan.md
   - Test result summary (total X cases: OK X / NG X)
   - Issues detected and observations
   - Improvement suggestions (code fixes, additional tests, etc.)

(B) Retest (summary section already has content)
1. Aggregate the "Result (retest)" column in the test case list
2. Read the retest evidence files (XX-<test-name>-retest.md)
3. Update the "Summary" section of test-plan.md
   - Retain the existing summary as an "Initial Test" subsection
   - Add a "Retest" subsection
     - Retest result summary (target X cases: OK X / NG X)
     - Description of fixes and confirmation of improvements
```

## Retest Preparation Steps

If the summary section exists in test-plan.md, execute this flow.

### Step R1: Confirm Retest Targets

1. Read the summary section of `(project)/test-outputs/test-plan.md`
2. Use AskUserQuestion to confirm the following
   - Test case numbers to retest (e.g., No.6)
   - AWS profile to use (can be omitted if same as the previous run)
   - Overview of the fixes made (to be recorded in the evidence)

### Step R2: Prepare Test Data

For the test cases targeted for retesting, verify and restore data according
to the data preparation section of test-plan.md.

### Step R3: Generate Retest Files and Present Next Steps

1. Create an evidence template for each retest target test case
   - Output destination: `(project)/test-outputs/evidences/XX-<test-name>-retest.md`
   - Same structure as the initial evidence (checklist table + evidence
     section)
   - Add a "Fixes Applied" section at the top (describing the fix overview
     confirmed in Step R1)
2. Generate a workflow.json for the retest
   - Only the execute + check steps for the target test cases
   - Add a summary step at the end (to update the summary in test-plan.md)
   - File name: `(project)/workflow.json` (overwrites the initial
     workflow.json)
3. Present the next steps in the same format as Step 6
