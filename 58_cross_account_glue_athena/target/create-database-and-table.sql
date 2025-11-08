-- Create Glue Database for Target Account
CREATE DATABASE IF NOT EXISTS cm_kasama_cross_account_target_db
COMMENT 'Target database for cross-account data copy'
LOCATION 's3://<TARGET_BUCKET_NAME>/';

-- Create Glue Table for Target Account
CREATE EXTERNAL TABLE IF NOT EXISTS cm_kasama_cross_account_target_db.sales_copy (
  id INT COMMENT 'Sales ID',
  product STRING COMMENT 'Product name',
  amount INT COMMENT 'Sales amount',
  date STRING COMMENT 'Sales date (YYYY-MM-DD)'
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 's3://<TARGET_BUCKET_NAME>/sales_copy/'
TBLPROPERTIES (
  'classification' = 'csv'
);
