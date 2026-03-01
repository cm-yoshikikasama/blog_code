-- noqa: disable=all
-- ========================================
-- 1. Glue Database 作成
-- ========================================
-- 注意: データベース名は parameter.ts の projectName と envName から生成されます
-- 形式: <PROJECT_NAME の - を _ に置換>_<ENV_NAME>
CREATE DATABASE IF NOT EXISTS <DATABASE_NAME>
COMMENT 'Database for Lambda + DuckDB Iceberg data copy';

-- ========================================
-- 2. Iceberg テーブル作成
-- ========================================
-- 注意: LOCATION は parameter.ts の設定に基づいて以下の形式になります
-- 形式: s3://<PROJECT_NAME>-<ENV_NAME>-target/iceberg/sales_data_iceberg/
CREATE TABLE <DATABASE_NAME>.sales_data_iceberg (
    id STRING,
    date DATE,
    sales_amount DOUBLE,
    quantity BIGINT,
    region STRING,
    updated_at TIMESTAMP
)
LOCATION 's3://<PROJECT_NAME>-<ENV_NAME>-target/iceberg/sales_data_iceberg/'
TBLPROPERTIES (
    'table_type' = 'ICEBERG',
    'format' = 'parquet',
    'write_compression' = 'snappy'
);
