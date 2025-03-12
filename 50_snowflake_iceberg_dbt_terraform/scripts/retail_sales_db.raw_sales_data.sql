CREATE EXTERNAL TABLE IF NOT EXISTS cm_kasama_retail_sales_db.raw_sales_data (
  transaction_id STRING,
  sale_date DATE,
  customer_id STRING,
  product_id STRING,
  quantity INT,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(10,2)
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
LOCATION 's3://<s3-bucket-name>/raw/'
TBLPROPERTIES ('skip.header.line.count'='1');
