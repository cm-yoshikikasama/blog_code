-- cSpell:words TBLPROPERTIES
-- Glue Database と Iceberg テーブル作成
-- Athena で実行してください
-- 注意: データベース名とS3バケット名は parameter.ts の projectName に合わせて調整してください

-- ========================================
-- 1. Glue Database 作成
-- ========================================
CREATE DATABASE IF NOT EXISTS cm_kasama_duckdb_iceberg_lambda_dev
COMMENT 'Database for DuckDB Lambda Iceberg data processing';

-- ========================================
-- 2. Iceberg テーブル作成
-- ========================================
CREATE TABLE cm_kasama_duckdb_iceberg_lambda_dev.processed_data_iceberg (
    id STRING,
    date DATE,
    sales_amount DECIMAL(10, 2),
    quantity INT,
    region STRING,
    created_at TIMESTAMP
)
LOCATION 's3://<TARGET_BUCKET_NAME>/iceberg/processed_data_iceberg/'
TBLPROPERTIES (
    'table_type' = 'ICEBERG',
    'format' = 'parquet',
    'write_compression' = 'snappy'
);
