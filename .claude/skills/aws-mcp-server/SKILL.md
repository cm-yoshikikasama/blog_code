---
name: aws-mcp-server
description: Access AWS MCP Server (Preview) for documentation search and API calls with IAM authentication and CloudTrail logging. Use when (1) searching AWS documentation with enterprise audit requirements, (2) making read-only AWS API calls, or (3) needing IAM-based access control for AI tools.
context: fork
---

# AWS MCP Server Skill

Skill for connecting to AWS's fully managed remote MCP server to execute documentation search and API calls.

## Prerequisites

- AWS credentials (temporary credentials after MFA authentication)
- Python 3.10+ (for uvx)

## Setup

```bash
cd .claude/skills/aws-mcp-server
pnpm install
```

## Usage

### Documentation Search (AWS Knowledge Feature)

```bash
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_SESSION_TOKEN=zzz \
  pnpm exec tsx index.ts search "Lambda concurrency" 5
```

### API Call (AWS API Feature) - Read-only Only

```bash
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy AWS_SESSION_TOKEN=zzz \
  pnpm exec tsx index.ts api "aws___call_aws" '{"cli_command":"aws s3 ls"}'
```

Arguments:

- `command` - Execution command (search, api)
- search: `query` (search query), `limit` (number of results, default: 5)
- api: `tool_name` (AWS MCP tool name), `args` (JSON format arguments)

## Output

### Search Results

```json
{
  "query": "Lambda concurrency",
  "totalResults": 6,
  "topResults": [
    {
      "title": "Concurrency - AWS Lambda",
      "url": "https://docs.aws.amazon.com/lambda/latest/api/API_Concurrency.html",
      "summary": "The number of concurrent executions that are reserved..."
    }
  ]
}
```

### API Call Results

```json
{
  "tool": "aws___call_aws",
  "success": true,
  "result": "2024-01-15 10:30:00 my-bucket\n2024-02-20 14:45:00 another-bucket..."
}
```

## Features

- Fine-grained access control via IAM authentication (SigV4)
- Audit logging with CloudTrail
- Flexible MFA authentication during session

## AWS MCP Server Actions

Control the following Actions via IAM policy:

- `aws-mcp:InvokeMcp` - MCP general
- `aws-mcp:CallReadOnlyTool` - Read-only tools
- `aws-mcp:CallReadWriteTool` - Read-write tools

## Notes

- AWS MCP Server is currently in Preview
- Do not execute write API calls (create, update, delete, etc.)
- Follow aws-operations.md for MFA authentication flow
