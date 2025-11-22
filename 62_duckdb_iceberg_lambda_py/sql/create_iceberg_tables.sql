-- ========================================
-- 1. Glue Database 作成
-- ========================================
CREATE DATABASE IF NOT EXISTS cm_kasama_iceberg_duckdb_lambda_dev
COMMENT 'Database for Lambda + DuckDB Iceberg data copy';

-- ========================================
-- 2. Iceberg テーブル作成
-- ========================================
CREATE TABLE cm_kasama_iceberg_duckdb_lambda_dev.sales_data_iceberg (
    id STRING,
    date DATE,
    sales_amount DOUBLE,
    quantity BIGINT,
    region STRING,
    created_at TIMESTAMP
)
LOCATION 's3://<TARGET_BUCKET_NAME>/iceberg/sales_data_iceberg/'
TBLPROPERTIES (
    'table_type' = 'ICEBERG',
    'format' = 'parquet',
    'write_compression' = 'snappy'
);
