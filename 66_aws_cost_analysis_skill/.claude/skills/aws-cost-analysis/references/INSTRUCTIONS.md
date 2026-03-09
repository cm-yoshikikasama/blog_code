# AWS Cost Analysis

A skill for analyzing CUR 2.0 Parquet data on S3 using DuckDB CLI.
CUR includes resource IDs and tag information, enabling resource-level cost attribution.

## Purpose

Automate cost data retrieval, analysis, and report generation from the CLI,
eliminating the need to repeatedly open Cost Explorer in the management console.
Analyze multiple accounts together and output a single HTML report with tabbed navigation.

## Prerequisites

- The following tools must be installed:
  - DuckDB CLI (`brew install duckdb` / `winget install DuckDB.cli`)
  - jq (`brew install jq` / `winget install jqlang.jq`)
  - AWS CLI v2

## AWS Credential Export

Export AWS credentials to environment variables before DuckDB can access S3.
Perform this step immediately before every DuckDB execution in this skill.

```bash
creds=$(aws configure export-credentials --profile $PROFILE) && \
export AWS_ACCESS_KEY_ID=$(echo $creds | jq -r .AccessKeyId) && \
export AWS_SECRET_ACCESS_KEY=$(echo $creds | jq -r .SecretAccessKey) && \
export AWS_SESSION_TOKEN=$(echo $creds | jq -r .SessionToken) && \
duckdb -c "<SQL>"
```

Credentials are temporary, so re-fetch them before each DuckDB execution.
Chain the commands with `&&` and execute in a single Bash invocation.

## Workflow

```text
Progress:
- [ ] Phase 0: Determine target accounts and profiles
- [ ] Phase 1: Select target period
- [ ] Phase 2: Run DuckDB analysis in parallel per account
- [ ] Phase 3: Generate consolidated HTML report for all accounts
```

Finalize targets in Phase 0-1, then run Phase 2 in parallel for all accounts.
Phase 3 outputs all account data into a single HTML file with tabbed navigation.

## Phase 0: Load Configuration and Select Accounts

### 0-1. Load Configuration File

Read `{SKILL_DIR}/config.yaml` using the Read tool.
This file defines the account list, profiles, S3 path patterns, and other settings.

```yaml
# config.yaml structure
s3PathPattern: "s3://{projectName}-{env}-cost-notify/cur-reports/..."
accounts:
  - name: my-account
    projectName: my-project
    profile: my-aws-profile
    env: dev
    budget: 400
```

### 0-2. Select Target Accounts

Present `accounts[].name` from config.yaml as options via AskUserQuestion.

```text
question: Which accounts do you want to analyze? (multiple selection allowed)
header: Target Accounts
multiSelect: true
options:
  - <list accounts[].name from config.yaml>
```

### 0-3. Derive S3 Paths

Interpolate each account's `projectName` and `env` into the `s3PathPattern` from config.yaml to generate S3 base paths.

### 0-4. Verify Authentication

Verify authentication for each selected account's `profile`.

```bash
aws sts get-caller-identity --profile $PROFILE
```

Phase 1 (month selection) is performed once for all accounts -- analyze the same month.

## Phase 1: Select Target Month

### 1-1. Get Available Months

Using any one account's credentials, execute the setup section + Query 0 from analysis_queries.sql.
Follow the "AWS Credential Export" section and execute in a single Bash invocation.

### 1-2. Select Target Month via AskUserQuestion

Present Query 0 results as options.

```text
question: Which month do you want to analyze?
header: Analysis Target Month (CUR data available)
options:
  - <list YYYY-MM from Query 0 results>
```

Use the selected month as `{TARGET_MONTH}` and its preceding month as `{PREV_MONTH}` in subsequent queries.
If `{PREV_MONTH}` data does not exist in CUR, skip month-over-month comparison and anomaly detection.

## Phase 2: Parallel Analysis Execution (Using Agent Tool)

When multiple accounts are selected, use the Agent tool to run analysis in parallel.
Use this pattern even for a single account (one Agent).

### Agent Prompt Construction

Read `{SKILL_DIR}/references/agent_prompt_template.md` using the Read tool,
then substitute variables (`{ACCOUNT_NAME}`, `{PROFILE}`, `{S3_BASE_PATH}`, etc.) with each account's settings.

The template contains these variables:

- `{ACCOUNT_NAME}`: Account display name
- `{PROFILE}`: AWS CLI profile name
- `{S3_BASE_PATH}`: S3 base path derived in Phase 0-3
- `{TARGET_MONTH}`: Target month selected in Phase 1
- `{PREV_MONTH}`: Previous month of the target
- `{BUDGET}`: Budget value from config.yaml
- `{DATA_AS_OF}`: Number of data days for mid-month analysis (empty if month is complete)
- `{SKILL_DIR}`: Skill directory path

### Agent Launch Example

When 2 accounts (account-a, account-b) are selected,
invoke 2 Agent tools simultaneously in a single message.

```text
Agent call 1:
  description: "account-a cost analysis"
  prompt: <expand agent_prompt_template.md with account-a config values>

Agent call 2:
  description: "account-b cost analysis"
  prompt: <expand agent_prompt_template.md with account-b config values>
```

When both Agents complete, extract the JSON portion from each result and combine into an array.

## Phase 3: Generate HTML Report

After all account Agents complete, output data into a single HTML with tabbed navigation.
For a single account, the tab bar is automatically hidden but the same template is used.

### Steps

1. Extract JSON from Agent results and write the combined array to `/tmp/cost_report_data.json` using the Write tool
2. Execute `scripts/generate_report.py` via the Bash tool
3. Remove the temporary file after execution

```bash
python3 {SKILL_DIR}/scripts/generate_report.py \
  --data-file /tmp/cost_report_data.json \
  --period '2026-03 (1-7d)' \
  --output {SKILL_DIR}/reports/2026-03.html && \
rm -f /tmp/cost_report_data.json
```

The script handles template loading, placeholder substitution, and file output.
The temporary file is no longer needed after report generation, so delete it in the same command.

### REPORT_DATA Structure (Array Format)

Array format combining Agent results. Each element is the JSON returned by an Agent.

```json
[
  {
    "name": "<account name>",
    "data": { ... }
  }
]
```

The template is backward-compatible and also works with the legacy format (direct object).

### Tabbed UI

- For multiple accounts, the tab bar shows account name + total cost + change rate
- Switch tabs by clicking or using left/right arrow keys
- Slide indicator follows with animation
- For a single account, the tab bar is automatically hidden

### Output Destination

```text
{SKILL_DIR}/
  └── reports/
        └── 2026-03.html
```

Create the `reports/` directory under `{SKILL_DIR}` if it does not exist.
After generating the report, inform the user of the file path.

## Notes

- The HTML report uses Chart.js (CDN), so an internet connection is required to display charts in the browser
- Fonts fall back to system fonts, so the layout is not affected if Google Fonts is unavailable
