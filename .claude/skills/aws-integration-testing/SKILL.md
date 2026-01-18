---
name: aws-integration-testing
description: Create integration test documents and evidence using aws-mcp-server script. Retrieve results with read-only commands and generate Markdown evidence. Job execution is performed by the user.
context: fork
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# AWS Integration Testing

Creates test case documents and generates Markdown evidence by retrieving results via aws-mcp-server skill.

## Prerequisites

- CDK stack is deployed
- Temporary credentials obtained with MFA authentication
- Required permissions granted to IAM role

## AWS Operation Method

Follow aws-operations.md and perform AWS operations via aws-mcp-server skill

### Script Execution Example

```bash
cd .claude/skills/aws-mcp-server && \
  env AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_SESSION_TOKEN=zzz \
  pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws s3 ls"}'
```

### Available Commands

| Command                       | Purpose                              |
| ----------------------------- | ------------------------------------ |
| `tools`                       | List available MCP tools             |
| `search <query> [limit]`      | Search AWS documentation             |
| `api <tool_name> <args_json>` | AWS API call (read-only operations)  |

## Allowed Commands (Read-only Only)

Commands available via aws-mcp-server skill:

- S3: `aws s3 ls`, `aws s3api list-objects-v2`, `aws s3api get-object`
- DynamoDB: `aws dynamodb query`, `aws dynamodb scan`, `aws dynamodb describe-table`
- Step Functions: `aws stepfunctions describe-execution`, `aws stepfunctions list-executions`
- CloudWatch: `aws cloudwatch get-metric-data`, `aws cloudwatch describe-alarms`
- Logs: `aws logs filter-log-events`, `aws logs describe-log-groups`
- Athena: `aws athena get-query-execution`, `aws athena get-query-results`
- Glue: `aws glue get-database`, `aws glue get-table`, `aws glue get-job-run`

## Prohibited Commands

Blocked within script:

- create, delete, update, put, terminate, modify, remove, start, stop, reboot

## Prohibited Long-running Job Execution

The following are prohibited (executed manually by user):

- `aws stepfunctions start-execution`
- `aws glue start-job-run`
- `aws events put-events`

Reason:

- Some jobs take over 30 minutes and may timeout
- Execution delegated to user for permission management

## Test Evidence Creation

Create test cases and evidence in `(project)/docs/test-evidence.md`

See [test-cases-template.md](test-cases-template.md) for template

### File Contents

- Normal test cases
  - Input data
  - Expected results
  - Verification method (commands to use)
- Error test cases
  - Error conditions
  - Expected errors
  - Verification method
- Data validation items
  - Athena queries
  - S3 verification items

## Evidence Retrieval Command Examples

Execute the following via aws-mcp-server skill (cd and environment variables omitted)

### Step Functions Execution Results

```bash
# Get execution result (after user execution)
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws stepfunctions describe-execution --execution-arn arn:aws:states:ap-northeast-1:123456789012:execution:MyStateMachine:exec-id"}'

# List execution history
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws stepfunctions list-executions --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:MyStateMachine --status-filter SUCCEEDED"}'
```

### S3 Data Verification

```bash
# List buckets
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws s3 ls"}'

# List objects
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws s3api list-objects-v2 --bucket bucket-name --prefix path/"}'
```

### CloudWatch Logs

```bash
# Get log events
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws logs filter-log-events --log-group-name /aws/lambda/function-name --filter-pattern ERROR"}'
```

### Glue

```bash
# Database information
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws glue get-database --name my_database"}'

# Table information
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws glue get-table --database-name my_database --name my_table"}'
```

### DynamoDB

```bash
# Table information
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws dynamodb describe-table --table-name my-table"}'
```

### Documentation Search

```bash
# Search AWS documentation
pnpm exec tsx index.ts search "Lambda concurrency" 5
```

## Test Flow

### Normal Test

1. Create test case document
2. User executes State Machine with valid input
3. Verify SUCCEEDED status with script
4. Validate output data
5. Create evidence

### Error Test

1. Create test case document
2. User executes State Machine with invalid input
3. Verify FAILED status with script
4. Validate error message
5. Create evidence

### Data Validation Test

1. Create test case document
2. Verify output file existence with S3 object list
3. Verify schema with Glue table information
4. Verify expected records with DynamoDB query
5. Create evidence

## Reference

- AWS operation details: .claude/rules/aws-operations.md
- Script details: .claude/skills/aws-mcp-server/SKILL.md
