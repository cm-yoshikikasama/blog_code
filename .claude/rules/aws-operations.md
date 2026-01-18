# AWS Operations Rules

All AWS operations must be executed via MCP script. Direct AWS CLI execution is prohibited.

## Basic Principles

- Never execute AWS CLI directly
- Perform AWS operations via `.claude/skills/aws-mcp-server` skill
- Destructive operations are blocked within the script

## MFA Authentication Flow

In environments requiring MFA authentication, execute in the following order:

1. Have the user select which profile to use
2. Retrieve target profile configuration from `~/.aws/config` (role_arn, source_profile, mfa_serial)
3. Automatically retrieve MFA code from 1Password CLI
   - `op item get "AWS" --vault Employee --otp`
4. Obtain temporary credentials with `aws sts assume-role`
5. Set obtained credentials as environment variables and execute MCP script
   - `cd .claude/skills/aws-mcp-server && env AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_SESSION_TOKEN=zzz pnpm exec tsx index.ts <command> <args>`
6. Temporary credentials are valid for approximately 1 hour, allowing multiple commands within the same session

### When 1Password CLI Is Unavailable

If 1Password CLI is not authenticated, manually retrieve MFA code using AskUserQuestion tool

## AWS Operation Commands

```bash
# Execute in aws-mcp-server directory
cd .claude/skills/aws-mcp-server && \
  env AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_SESSION_TOKEN=zzz \
  pnpm exec tsx index.ts <command> <args>
```

### Available Commands

| Command                       | Purpose                              |
| ----------------------------- | ------------------------------------ |
| `tools`                       | List available MCP tools             |
| `search <query> [limit]`      | Search AWS documentation             |
| `api <tool_name> <args_json>` | AWS API call (read-only operations)  |

### Usage Examples

```bash
# Execute within aws-mcp-server directory (env and credentials omitted)

# List S3 buckets
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws s3 ls"}'

# Step Functions execution result
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws stepfunctions describe-execution --execution-arn arn:aws:states:..."}'

# CloudWatch Logs
pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws logs filter-log-events --log-group-name ..."}'

# Documentation search
pnpm exec tsx index.ts search "Lambda concurrency" 5
```

## Exceptions (Cases Where Direct AWS CLI Execution Is Permitted)

Only the following direct AWS CLI executions are allowed:

- Get profile list: `grep '\[profile' ~/.aws/config`
- Read configuration file: `grep -A 10 '\[profile xxx\]' ~/.aws/config`
- Obtain credentials: `aws sts assume-role ...`

## Prohibited Operations

Blocked within aws-mcp-server skill, but the following must never be executed:

- create, delete, update, put, terminate, modify, remove
- start, stop, reboot
- attach, detach

Only read-only operations are allowed (Describe, List, Get, etc.)
