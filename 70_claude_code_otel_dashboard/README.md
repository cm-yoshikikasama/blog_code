# Claude Code OTel → CloudWatch Dashboard

Visualize team Claude Code usage by sending OpenTelemetry logs directly to the CloudWatch Logs OTLP endpoint (no collector required), sanitizing them with a Lambda, and viewing them on a CloudWatch Dashboard. A companion skill generates a weekly Slack digest.

## Overview

Claude Code emits OTel logs (cost, tokens, model, skill/subagent/MCP usage) to the CloudWatch Logs OTLP endpoint using Bearer Token authentication. Raw events land in a short-retention log group; a sanitizer Lambda forwards only allowlisted fields (no prompts, no bash commands, no file paths) to a sanitized log group. The dashboard and the weekly digest skill read only the sanitized group.

```text
Claude Code (each member)
  → CloudWatch Logs OTLP endpoint (us-east-1, Bearer Token auth)
  → Raw LogGroup /{ProjectName}/claude-otel (retention 1 day)
  → Subscription Filter → Sanitizer Lambda (allowlist)
  → Sanitized LogGroup /{ProjectName}/claude-otel-sanitized (retention 90 days)
  → CloudWatch Dashboard / claude-usage-digest skill (weekly Slack digest)
```

## Constraints

- Bearer Token authentication for the CloudWatch Logs OTLP endpoint is US regions only (us-east-1, us-east-2, us-west-1, us-west-2)
- Bearer Token supports logs only (metrics are not supported as of 2026-04)
- `claude_code.skill_activated` fires only for user-global (`~/.claude/skills/`), plugin, and built-in skills. Project-local skills do not fire

## File Structure

```text
70_claude_code_otel_dashboard/
├── cfn/
│   └── claude-otel-logs.yml          # LogGroups, IAM user, Dashboard
├── sam/
│   └── claude-otel-sanitizer/
│       ├── template.yaml             # Sanitizer Lambda + Subscription Filter
│       ├── samconfig.toml
│       ├── src/handler.py            # Allowlist filter
│       └── tests/test_handler.py
└── .claude/skills/claude-usage-digest/   # Weekly Slack digest skill
    ├── SKILL.md
    ├── references/
    ├── scripts/queries.txt           # Logs Insights query collection
    └── templates/digest-template.txt
```

## Deploy

### 1. CFn (log groups, IAM user, dashboard)

```bash
aws cloudformation deploy \
  --stack-name demo-team-claude-otel-logs \
  --template-file cfn/claude-otel-logs.yml \
  --parameter-overrides ProjectName=demo-team LogRetentionDays=60 RawLogRetentionDays=1 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1 \
  --profile <your-profile>
```

### 2. Sanitizer Lambda (SAM)

```bash
cd sam/claude-otel-sanitizer
pytest tests/ -v
sam build
sam deploy --profile <your-profile>
```

### 3. Manual steps

1. CloudWatch console (us-east-1) → Log groups → `/{ProjectName}/claude-otel` → Actions → Enable bearer token authentication
2. IAM console → Users → `{ProjectName}-claude-otel-writer` → Security credentials → API keys → Create API key (note the secret; it cannot be shown again)
3. (Optional) Store the token in SSM Parameter Store as SecureString `/{ProjectName}/claude-otel/bearer-token` for team distribution

### 4. Client setup (each member)

Add to `~/.claude/settings.json` (never commit the token to a repository):

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "https://logs.us-east-1.amazonaws.com",
    "OTEL_EXPORTER_OTLP_HEADERS": "Authorization=Bearer <token>,x-aws-log-group=/demo-team/claude-otel,x-aws-log-stream=code",
    "OTEL_LOG_TOOL_DETAILS": "1",
    "OTEL_RESOURCE_ATTRIBUTES": "user.plan=pro"
  }
}
```

## Weekly Slack Digest

Copy `.claude/skills/claude-usage-digest/` into your project (or `~/.claude/skills/`), create `custom/config.env` from `references/config.env.example`, and run:

```text
/claude-usage-digest            # weekly Slack digest for the last 7 days
/claude-usage-digest <question> # natural-language usage analysis
```

## Cost

Estimated from 8 days of real ingest (32 MB, 3 users): about $0.19/month for 3 users, about $10/month for 100 heavy users (raw + sanitized ingest, storage, Lambda). Logs Insights queries are billed separately at $0.005/GB scanned.
