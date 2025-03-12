CREATE OR REPLACE EXTERNAL TABLE SALES_TRANSACTIONS_EXTERNAL (
  transaction_id VARCHAR,
  sale_date DATE,
  customer_id VARCHAR,
  product_id VARCHAR,
  quantity NUMBER,
  unit_price NUMBER(10,2),
  total_amount NUMBER(10,2),
  sale_year NUMBER,
  sale_month NUMBER
)
WITH LOCATION = @${snowflake_stage.external_stage.name}/tables
FILE_FORMAT = (TYPE = PARQUET)
TABLE_FORMAT = ICEBERG;
