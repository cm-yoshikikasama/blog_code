# Integration Test Preparation

Creates a test plan document, verifies prerequisites, prepares test data,
and generates a workflow.json for the Ralph Loop. The actual test execution
is outside the scope of this skill.

## Prerequisites

- The CDK stack must be deployed
- The IAM role for the AWS profile to be used must have the required
  permissions

## Workflow Overview

This skill handles Phase 1 (test preparation). Phase 2 (test execution) is
launched manually by the user from a terminal.

### Initial Test

1. Phase 1: Test preparation (Steps 1-6)
2. Phase 2: Automated test execution (shell) → Records everything through
   the summary automatically

### Retest (when issues are detected in the summary)

1. User fixes the code
2. Phase 1: Retest preparation (Steps R1-R3)
3. Phase 2: Automated test execution (shell) → Updates the summary

### Phase 2: Automated Test Execution (outside the scope of this skill)

The user launches the script from a separate terminal tab.

```bash
skills/prepare-integration-test/scripts/run-integration-test.sh <workflow-file>
```

The script invokes `claude -p` (pipe mode) in a loop (Ralph Loop pattern).
Each iteration processes one pending step and exits.
Since `claude -p` runs as an independent process, it does not consume the
interactive mode's context window.

### Running the Script from within the Skill is Prohibited

Do not run `run-integration-test.sh` from Claude Code's Bash tool.
The script internally calls `claude -p`, which would create a nested
structure where Claude launches Claude, blocking the outer session for a
long time.

### Mode Detection

At skill startup, check the state of `(project)/test-outputs/test-plan.md` to
determine the execution mode.

- test-plan.md does not exist, or has no "Summary" section → Initial test
  (Steps 1-6)
- test-plan.md has a "Summary" section → Retest preparation (Steps R1-R3)

## Initial Test Execution Steps

### Step 1: Pre-interview

Before generating files, confirm the test conditions.

1. Read the design document (`(project)/test-outputs/design.md`) and CDK code
   (`(project)/cdk/lib/`) to understand the testable scope
2. Run `grep '\[profile' ~/.aws/config` to get the list of profiles
3. Use AskUserQuestion to confirm the following
   - AWS profile to use (select from the retrieved list)
   - Test scope (normal cases only / including error cases / including
     boundary values)
   - Any additional test perspectives (if any)
   - Model for Phase 2 execution (default: sonnet)
   - Wait interval between loop iterations (suggest based on the expected
     job execution time; default 60 seconds)

### Step 2: Create the Test Plan Document

Create `(project)/test-outputs/test-plan.md` reflecting the results from the Step 1
interview. Do not create evidence files at this point.

1. Follow the test-plan.md template in
   [test-cases-template.md](./test-cases-template.md) (also refer to the
   template for the test classification guide, ETL validation perspective
   checklist, and expected result description rules)
2. Define test cases according to the test scope confirmed in Step 1
3. Output to `(project)/test-outputs/test-plan.md`

### Step 3: Review the Test Plan Document

Present the contents of test-plan.md to the user and obtain approval via
AskUserQuestion.

Items to confirm

- Whether test cases are complete (no missing or unnecessary cases)
- Validity of expected results
- Dependencies in test execution order

If modifications are needed, update test-plan.md and review again. Since
test-plan.md is a single file, the revision cost is low.

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
     (confirmation is possible since Phase 1 is in interactive mode)
   - The cleanup method depends on the project's data strategy, so leave the
     decision to the user

4. Place test data
   - Check whether the CSV files used in the test cases exist in S3
   - If not, upload them from the project's `resources/data/`
   - Report the upload results to the user

5. Display a summary of check results to the user
   - Account ID, region, ARN/name of each resource
   - Existing row count in the output table
   - List of uploaded test data

### Step 5: Generate Evidence Files and workflow.json

Generate files only after the test plan has been approved and the
prerequisite checks are complete.

1. Follow the evidence file template in
   [test-cases-template.md](./test-cases-template.md) and create a file for
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
- Since the prerequisite check is complete in Phase 1, do not include it in
  workflow.json
- In each step's `prompt` field, include the content from the "Step Prompt
  Templates" below
  - `X-execute` → "Job Execution" template
  - `X-check` → "Result Check and Evidence" template
  - `summary` → "Summary" template

workflow.json structure

```json
{
  "version": 1,
  "project": "(project-path)",
  "evidence_dir": "test-outputs/evidences/",
  "aws_profile": "(profile name confirmed in Step 1)",
  "model": "(model name confirmed in Step 1, e.g. sonnet)",
  "interval": (wait interval in seconds confirmed in Step 1),
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

- `aws_profile`: Profile name used with the AWS CLI (`--profile` flag in Phase 2)
- `model`: Claude model name for Phase 2 execution (`--model` flag in `claude -p`)
- `interval`: Wait interval in seconds between Ralph Loop iterations
  (used for sleep while waiting for async job completion)
- `config.max_retries`: Fixed value `1`. Do not change

Step fields

- `id`: Unique identifier for the step (`<number>-execute` /
  `<number>-check` / `summary`). The execute/check pair can be inferred from
  the naming convention
- `retry`: Current retry count (initial value 0)
- `output`: Output value of the step (execution ARN, etc.; initial value
  null)
- `prompt`: Step-specific prompt passed to `claude -p`
- Steps are executed in the order of the array (the execute → check order is
  guaranteed by the naming convention)
- On retry, the orchestrator derives `<N>-execute` from `<N>-check` and
  resets the pair

### Step 6: Present the Launch Command

After generating workflow.json, inform the user in the following format.
Do not wrap the command with backslashes; always output it as a single line
(to prevent invisible characters from being mixed in when copying, which
would cause errors).
Output the paths for the workflow-file and .workflow-log as absolute paths
(so they do not depend on the user's current directory).

```text
Test preparation is complete. Run the following command in a separate terminal tab.

bash skills/prepare-integration-test/scripts/run-integration-test.sh <absolute-path-to-workflow-file>

workflow-file: <absolute path to the generated workflow.json>
(aws_profile, model, and interval are already recorded in workflow.json)

If you want to monitor progress in real time, run the following in yet another tab.

tail -f <absolute-path-to-project>/test-outputs/.workflow-log | grep --line-buffered -o '"type":"text","text":"[^"]*"' | sed 's/"type":"text","text":"//;s/"$//'

To resume after interruption, simply re-run the same command (the state of workflow.json is preserved).
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

3. Record the evidence
   - Initial run: Record in <project-path>/test-outputs/evidences/XX-<test-name>.md
   - Retest: Create a new file <project-path>/test-outputs/evidences/XX-<test-name>-retest.md and record there
   - Update the "Actual value" and "Judgment" columns in the checklist table
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

### Step R3: Generate Retest Files and Present Launch Command

1. Create an evidence template for each retest target test case
   - Output destination: `(project)/test-outputs/evidences/XX-<test-name>-retest.md`
   - Same structure as the initial evidence (checklist table + evidence
     section)
   - Add a "Fixes Applied" section at the top (describing the fix overview
     confirmed in Step R1)
2. Generate a workflow.json for the retest
   - Only the execute + check steps for the target test cases
   - Add a summary step at the end (to update the summary in test-plan.md)
   - File name: `(project)/test-outputs/workflow.json` (overwrites the initial
     workflow.json)
3. Present the launch command in the same format as Step 6
