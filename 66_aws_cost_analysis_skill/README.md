# aws-cost-analysis

A Claude Code skill that analyzes AWS cost data from CUR 2.0 Parquet files using DuckDB CLI, generating an interactive HTML report with tabbed multi-account views, daily trend charts, resource-level attribution, and optimization recommendations.

## Architecture

![Architecture](generated-diagrams/architecture.drawio.png)

```text
.claude/skills/aws-cost-analysis/
├── SKILL.md                         # Skill entry point (loaded by Claude Code)
├── config.yaml.example              # Configuration template
├── references/
│   ├── INSTRUCTIONS.md              # Main workflow (Phase 0-3)
│   ├── agent_prompt_template.md     # Per-account Agent prompt template
│   └── analysis_queries.sql         # DuckDB queries for CUR 2.0
└── scripts/
    ├── generate_report.py           # HTML report generator
    └── report_template.html         # Report UI template (Chart.js + tabs)
```

## How It Works

1. User invokes `/aws-cost-analysis` in Claude Code
2. Claude reads `config.yaml` to get account list and S3 paths
3. User selects target accounts and month
4. For each account, an Agent runs DuckDB queries against CUR 2.0 Parquet on S3
   - Service-level cost breakdown and month-over-month comparison
   - Resource-level top 20 costs with activity status
   - Anomaly detection (50%+ cost spikes)
   - New service detection
   - Creator identification via tags, resource names, and CloudTrail
5. All results are combined into a single HTML report with:
   - Tabbed navigation for multi-account views
   - Summary cards (total, forecast, budget utilization)
   - Service cost bar chart with previous period comparison
   - Daily stacked bar chart with previous month overlay
   - Resource table grouped by service with activity indicators
   - Prioritized recommendations with estimated savings

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)
- [DuckDB CLI](https://duckdb.org/docs/installation/)
- [jq](https://jqlang.github.io/jq/)
- AWS CLI v2
- CUR 2.0 export configured in Parquet format with Hive-style partitioning

## Setup

1. Copy the skill directory into your project's `.claude/skills/` directory

2. Create config.yaml from the example:

   ```bash
   cp config.yaml.example config.yaml
   ```

3. Edit `config.yaml` with your account details:

   ```yaml
   s3PathPattern: "s3://{projectName}-{env}-cost-notify/cur-reports/{projectName}-{env}-cur-cost-analysis/data"

   accounts:
     - name: my-account
       projectName: my-project
       profile: my-aws-profile
       env: dev
       budget: 500
   ```

4. Add `config.yaml` to `.gitignore` (contains profile names and account info)

5. Invoke the skill in Claude Code:

   ```text
   /aws-cost-analysis
   ```

## Report Output

Reports are generated as standalone HTML files in `reports/`:

```text
reports/
  └── 2026-03.html
```

The HTML report uses Chart.js via CDN, so an internet connection is required to render charts in the browser. Fonts gracefully fall back to system fonts if Google Fonts is unavailable.

## Key Design Decisions

- DuckDB CLI queries S3 directly -- no need for Athena, Redshift, or any persistent database
- Agent tool enables parallel analysis across multiple AWS accounts
- Mid-month analysis compares the same date range of the previous month (not full month) for fair comparison
- CloudTrail lookups are limited to 5 resources maximum to minimize API costs
- Resource activity status is determined solely from CUR data (`isActive` flag), not from live AWS API calls

## License

MIT
