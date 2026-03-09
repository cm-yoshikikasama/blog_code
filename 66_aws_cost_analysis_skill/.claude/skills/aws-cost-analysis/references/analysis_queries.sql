-- ============================================
-- AWS Cost Analysis Queries for DuckDB CLI
-- Query CUR 2.0 Parquet data directly from S3
-- ============================================
-- Usage:
--   1. Replace <YOUR-BUCKET>/<YOUR-EXPORT-NAME> in the setup section
--      with the actual S3 path ({S3_BASE_PATH})
--   2. Replace {TARGET_MONTH} and {PREV_MONTH} in each query with actual values
--   3. Always prepend the setup section when running each query
--      (DuckDB CLI is stateless, so views are lost between executions)
-- ============================================

-- ============================================
-- Setup (must be run every time in DuckDB CLI)
-- ============================================

-- S3 authentication
-- Export credentials to environment variables before execution
CREATE OR REPLACE SECRET (TYPE s3, REGION 'ap-northeast-1', PROVIDER credential_chain);

-- Create view from CUR Parquet on S3
-- Automatically recognizes Hive partitions (BILLING_PERIOD=YYYY-MM)
CREATE OR REPLACE VIEW cur AS
SELECT *
FROM read_parquet(
    's3://<YOUR-BUCKET>/cur-reports/<YOUR-EXPORT-NAME>/data/**/*.parquet',
    hive_partitioning=true
);

-- Usage-only view (excludes Tax, Credit, Refund, etc.)
CREATE OR REPLACE VIEW cur_usage AS
SELECT *
FROM cur
WHERE line_item_line_item_type = 'Usage';

-- ============================================
-- Query 0: Check available BILLING_PERIODs
-- ============================================
SELECT DISTINCT BILLING_PERIOD
FROM cur
ORDER BY BILLING_PERIOD DESC
LIMIT 12;

-- ============================================
-- Service Analysis Queries (used in Step 2)
-- ============================================

-- Query 2: Cost by service (target month, $10+)
SELECT
    line_item_product_code AS service,
    ROUND(SUM(line_item_unblended_cost), 2) AS cost
FROM cur_usage
WHERE BILLING_PERIOD = '{TARGET_MONTH}'
GROUP BY service
HAVING cost >= 10
ORDER BY cost DESC;

-- Query 3: Month-over-month comparison (by service)
-- For mid-month, add DAY(...) <= {DATA_AS_OF} filter
WITH monthly AS (
    SELECT
        BILLING_PERIOD AS month,
        line_item_product_code AS service,
        SUM(line_item_unblended_cost) AS cost
    FROM cur_usage
    WHERE BILLING_PERIOD IN ('{TARGET_MONTH}', '{PREV_MONTH}')
    GROUP BY month, service
)
SELECT
    month,
    service,
    ROUND(cost, 2) AS current_cost,
    ROUND(LAG(cost) OVER (PARTITION BY service ORDER BY month), 2) AS prev_cost,
    ROUND(cost - LAG(cost) OVER (PARTITION BY service ORDER BY month), 2) AS diff,
    ROUND((cost - LAG(cost) OVER (PARTITION BY service ORDER BY month))
          / NULLIF(LAG(cost) OVER (PARTITION BY service ORDER BY month), 0) * 100, 1) AS pct_change
FROM monthly
WHERE cost >= 10
ORDER BY month DESC, current_cost DESC;

-- Query 10: Cost spike detection (50%+ increase over previous month)
-- For mid-month, compare same periods
WITH monthly AS (
    SELECT
        BILLING_PERIOD AS month,
        line_item_product_code AS service,
        SUM(line_item_unblended_cost) AS cost
    FROM cur_usage
    WHERE BILLING_PERIOD IN ('{TARGET_MONTH}', '{PREV_MONTH}')
    GROUP BY month, service
    HAVING cost >= 5
)
SELECT
    service,
    ROUND(cost, 2) AS current_cost,
    ROUND(LAG(cost) OVER (PARTITION BY service ORDER BY month), 2) AS prev_cost,
    ROUND((cost - LAG(cost) OVER (PARTITION BY service ORDER BY month))
          / NULLIF(LAG(cost) OVER (PARTITION BY service ORDER BY month), 0) * 100, 1) AS pct_change
FROM monthly
WHERE month = (SELECT MAX(BILLING_PERIOD) FROM cur_usage)
HAVING pct_change >= 50
ORDER BY pct_change DESC;

-- Query 11: Daily cost trend by service (current + previous month, top services only)
-- Data for the daily trend chart in the report
WITH top_services AS (
    SELECT line_item_product_code AS service
    FROM cur_usage
    WHERE BILLING_PERIOD = '{TARGET_MONTH}'
      AND line_item_unblended_cost > 0
    GROUP BY service
    ORDER BY SUM(line_item_unblended_cost) DESC
    LIMIT 8
)
SELECT
    BILLING_PERIOD AS month,
    DAY(line_item_usage_start_date::DATE) AS day,
    line_item_product_code AS service,
    ROUND(SUM(line_item_unblended_cost), 2) AS daily_cost
FROM cur_usage
WHERE BILLING_PERIOD IN ('{TARGET_MONTH}', '{PREV_MONTH}')
  AND line_item_product_code IN (SELECT service FROM top_services)
GROUP BY month, day, service
ORDER BY month, day, service;

-- ============================================
-- Resource Analysis Queries (used in Step 3)
-- ============================================

-- Query 6: Cost by resource ID Top 20 (with activity status)
SELECT
    line_item_product_code AS service,
    line_item_resource_id AS resource_id,
    line_item_usage_type AS usage_type,
    ROUND(SUM(line_item_unblended_cost), 2) AS cost,
    COUNT(DISTINCT line_item_usage_start_date::DATE) AS active_days,
    MIN(line_item_usage_start_date::DATE) AS first_seen,
    MAX(line_item_usage_start_date::DATE) AS last_seen
FROM cur_usage
WHERE BILLING_PERIOD = '{TARGET_MONTH}'
  AND line_item_unblended_cost > 0
  AND line_item_resource_id <> ''
GROUP BY service, resource_id, usage_type
ORDER BY cost DESC
LIMIT 20;

-- Query 8: Tagged resource costs (using resource_tags column)
SELECT
    line_item_product_code AS service,
    line_item_resource_id AS resource_id,
    resource_tags,
    ROUND(SUM(line_item_unblended_cost), 2) AS cost
FROM cur_usage
WHERE BILLING_PERIOD = '{TARGET_MONTH}'
  AND line_item_unblended_cost > 0
  AND resource_tags IS NOT NULL
GROUP BY service, resource_id, resource_tags
ORDER BY cost DESC
LIMIT 20;

-- Query 9: New service detection (services not present in previous month)
WITH current_month AS (
    SELECT DISTINCT line_item_product_code AS service
    FROM cur_usage
    WHERE BILLING_PERIOD = '{TARGET_MONTH}'
      AND line_item_unblended_cost > 0
),
prev_month AS (
    SELECT DISTINCT line_item_product_code AS service
    FROM cur_usage
    WHERE BILLING_PERIOD = '{PREV_MONTH}'
      AND line_item_unblended_cost > 0
)
SELECT
    c.service,
    'new' AS status
FROM current_month c
LEFT JOIN prev_month p ON c.service = p.service
WHERE p.service IS NULL;
