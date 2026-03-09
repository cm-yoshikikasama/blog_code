# AWS Cost Analysis: {ACCOUNT_NAME}

## Parameters

- Account name: {ACCOUNT_NAME}
- AWS profile: {PROFILE}
- S3 base path: {S3_BASE_PATH}
- Target month: {TARGET_MONTH}
- Previous month: {PREV_MONTH}
- Budget: {BUDGET}
- Data days (mid-month): {DATA_AS_OF} (empty if month is complete)

## Credential + DuckDB Execution Pattern

Use the following pattern for credential export and DuckDB execution.
Replace `<SQL>` with the actual query.
Credentials are temporary, so re-fetch them immediately before each DuckDB execution.

```bash
creds=$(aws configure export-credentials --profile {PROFILE}) && \
export AWS_ACCESS_KEY_ID=$(echo $creds | jq -r .AccessKeyId) && \
export AWS_SECRET_ACCESS_KEY=$(echo $creds | jq -r .SecretAccessKey) && \
export AWS_SESSION_TOKEN=$(echo $creds | jq -r .SessionToken) && \
duckdb -c "<SQL>"
```

## Steps

### Step 1: Prepare SQL Queries

Read the following file using the Read tool:

- `{SKILL_DIR}/references/analysis_queries.sql`

Replace `<YOUR-BUCKET>/<YOUR-EXPORT-NAME>` in the setup section with the `{S3_BASE_PATH}` value.
Replace `{TARGET_MONTH}` and `{PREV_MONTH}` in each query with actual values.

### Step 2: Service Analysis (DuckDB Execution 1)

Specify the following combined SQL in the `<SQL>` of the "Credential + DuckDB Execution Pattern":

- Setup section
- Query 2
- Query 3
- Query 10
- Query 11

Query filter conditions:

- Query 2: `BILLING_PERIOD = '{TARGET_MONTH}'`
- Query 3: Month-over-month comparison. For mid-month, add `DAY(...) <= {DATA_AS_OF}`
- Query 10: Detect services with 50%+ increase over previous month. For mid-month, compare same periods
- Query 11: `BILLING_PERIOD IN ('{TARGET_MONTH}', '{PREV_MONTH}')`

### Step 3: Resource Analysis (DuckDB Execution 2)

Specify the following combined SQL in the same "Credential + DuckDB Execution Pattern":

- Setup section
- Query 6
- Query 8
- Query 9

### Step 4: Mid-Month Previous Period Comparison

If {TARGET_MONTH} is not yet complete, compare with the same period of the previous month.

Example: analyzing on March 5

- Current month: March 1-5 costs
- Previous month: February 1-5 costs (not the entire February)

Store both same-period and full-month data in REPORT_DATA:

- `summary.prevPeriodCost`: Previous month same-period cost (used for change calculation)
- `summary.prevFullCost`: Previous month full cost (for reference display)
- `serviceCosts[].prevPeriodCost`: Per-service previous month same-period cost
- `serviceCosts[].prevFullCost`: Per-service previous month full cost
- `serviceCosts[].change`: Change rate against prevPeriodCost

For a completed month, omit `dataAsOf` or set it equal to the number of days in the month.

### Step 5: Identify Resource Creators via CloudTrail

For top resources (Query 6), identify creators.
Use the following priority order, with CloudTrail as a last resort.

Priority order:

1. CUR tag information (Owner tag, etc.) -- use directly if available
2. Username embedded in resource name/ARN (e.g., `john.doe` in the name)
3. CloudTrail (only if unknown from above, limited to top 5 resources)

CloudTrail lookups have high API call costs, so follow these rules:

- Skip CloudTrail for resources identifiable from tags or resource names
- Limit CloudTrail lookups to a maximum of 5 resources
- For unidentifiable resources, set `creator: "unknown"` without forcing CloudTrail

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue="resource-id" \
  --max-results 3 \
  --profile {PROFILE} \
  --output json
```

Extract the creator (IAM user/role) from the `Username` field in the response.

### Step 6: Generate Recommendations

Analyze query results and generate at least one recommendation.
Each action must clearly specify "who" should do "what".

Owner identification (priority order):

1. CUR tag information (Owner tag, etc.)
2. Username/team name in resource names
3. CloudTrail `Username` (retrieved in Step 5)
4. If unknown from all above, set `owner: "unknown"`

Activity status considerations:

- Always check `isActive` in topResources (whether last usage date matches the data end date)
- The CUR data `isActive` flag is the only basis for judgment. Do not check actual resource states via AWS CLI
- For `isActive: false` (stopped) resources, do not recommend stopping/deleting/scaling down. State "already stopped"
- For stopped resources with ongoing storage charges, only mention storage costs (no compute recommendations)
- For `isActive: true` with `activeDays` matching total days, label as "continuously running" and prioritize optimization
- For `isActive: false` with few `activeDays` (spike usage), treat as temporary and do not overestimate monthly projections

Cost estimation caveats:

- Do not extrapolate `estimatedSaving` by evenly dividing total cost by days
- Always check daily costs (dailyCosts) to distinguish temporary spikes from sustained costs
- Example: Redshift at $14 over 7 days may be $0.01/day storage while paused + $14 for 2 days of compute, so the month-end projection is ~$14.24, not $60
- For stopped resources, estimate monthly cost using only post-stop daily rates (storage, etc.)

Check priorities (high to low):

1. anomalies (Query 10): Services with 50%+ increase over previous month -- request investigation and remediation
2. topResources (Query 6): High-cost running resources -- request optimization (reserved, scale down, deletion, etc.)
3. New services (Query 9): Verify no unintended usage
4. Untagged resources: Request tagging for cost attribution
5. Overall trends: Propose actions for budget deviation and cost increase trends

Output each recommendation in this format:

- `title`: Specific action name (e.g., "Consider Reserved Instance for RDS")
- `owner`: Action owner (e.g., `user@example.com`, "admin-role", "unknown")
- `resourceId`: Target resource ID (if applicable)
- `description`: Specific reasoning, steps, and expected impact
- `priority`: "high" / "medium" / "low"
- `estimatedSaving`: Estimated savings (USD). Use `null` if difficult to calculate

For very low-cost accounts (total under $10), include at least one confirmation result such as "no action needed".

### Step 7: Return Results as JSON

Combine all query results into the following JSON structure and return as the final message.
Do not include any extra text besides JSON.

```json
{
  "name": "{ACCOUNT_NAME}",
  "data": {
    "summary": {
      "totalCost": 123.45,
      "prevPeriodCost": 100.00,
      "prevFullCost": 356.05,
      "costChange": 23.45,
      "costChangePercent": 23.5,
      "budget": 400.00,
      "dataAsOf": 5
    },
    "serviceCosts": [
      { "service": "AmazonEC2", "cost": 50.00, "prevPeriodCost": 40.00, "prevFullCost": 168.07, "change": 25.0 }
    ],
    "topResources": [
      {
        "service": "AmazonEC2",
        "resourceId": "i-abc123",
        "cost": 30.00,
        "activeDays": 7,
        "lastSeen": "2026-03-07",
        "isActive": true,
        "tags": "Owner=someone",
        "creator": "user@example.com"
      }
    ],
    "dailyCosts": [
      { "month": "2026-02", "day": 1, "service": "AmazonEC2", "cost": 1.50 }
    ],
    "anomalies": [
      { "service": "AmazonS3", "currentCost": 20.00, "prevCost": 5.00, "pctChange": 300.0 }
    ],
    "recommendations": [
      {
        "title": "Consider Reserved Instance for RDS",
        "owner": "user@example.com",
        "resourceId": "db-abc123",
        "description": "RDS running continuously for 7 days (on pace for $30/month). ~40% savings possible with Reserved Instance",
        "priority": "high",
        "estimatedSaving": 12.00
      }
    ]
  }
}
```
