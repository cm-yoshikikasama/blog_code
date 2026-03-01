CREATE EXTERNAL TABLE cm_kasama_db.test_table (
    id STRING,
    name STRING  -- noqa: RF04
)
PARTITIONED BY (
    year STRING,  -- noqa: RF04
    month STRING,  -- noqa: RF04
    day STRING  -- noqa: RF04
)
STORED AS PARQUET
LOCATION 's3://<your-s3-bucket>/test_table/'
TBLPROPERTIES (
    'projection.enabled' = 'true',
    'projection.year.type' = 'date',
    'projection.year.format' = 'yyyy',
    'projection.year.range' = '2024,NOW',
    'projection.month.type' = 'integer',
    'projection.month.range' = '1,12',
    'projection.month.digits' = '2',
    'projection.day.type' = 'integer',
    'projection.day.range' = '1,31',
    'projection.day.digits' = '2',
    'storage.location.template' = 's3://<your-s3-bucket>/test_table/${year}/${month}/${day}'
);
