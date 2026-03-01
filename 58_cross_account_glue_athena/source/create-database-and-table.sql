-- noqa: disable=all
-- Create Glue Database
CREATE DATABASE IF NOT EXISTS cm_kasama_cross_account_db
COMMENT 'Database for cross-account access testing'
LOCATION 's3://<SOURCE_BUCKET_NAME>/data/';

-- Create Glue Table
CREATE EXTERNAL TABLE IF NOT EXISTS cm_kasama_cross_account_db.sales (
  id INT COMMENT 'Sales ID',
  product STRING COMMENT 'Product name',
  amount INT COMMENT 'Sales amount',
  date STRING COMMENT 'Sales date (YYYY-MM-DD)'
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 's3://<SOURCE_BUCKET_NAME>/data/'
TBLPROPERTIES (
  'skip.header.line.count' = '1',
  'classification' = 'csv'
);
