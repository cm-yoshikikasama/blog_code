CREATE EXTERNAL TABLE cm_kasama_sample.medium_sample (
  customer_id STRING,
  full_name STRING,
  email STRING,
  phone STRING,
  company STRING,
  purchase_amount STRING,
  category STRING,
  transaction_date STRING,
  country STRING,
  city STRING,
  postal_code STRING,
  status STRING
)
STORED AS PARQUET
LOCATION 's3://<your-source-bucket>/target/medium_sample/'
TBLPROPERTIES ('parquet.compress'='SNAPPY');
