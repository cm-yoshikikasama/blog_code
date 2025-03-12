CREATE TABLE IF NOT EXISTS cm_kasama_retail_sales_db.sales_transactions (
  transaction_id STRING,
  sale_date DATE,
  customer_id STRING,
  product_id STRING,
  quantity INT,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(10,2)
)
LOCATION 's3://<s3-bucket-name>/iceberg/sales_transactions/'
TBLPROPERTIES (
    'table_type'='iceberg',
    'write_compression' = 'zstd',
    'format'='PARQUET'
);
