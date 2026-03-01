SELECT
    id,
    date,
    CAST(sales_amount AS DECIMAL(10, 2)) AS sales_amount,
    CAST(quantity AS INTEGER) AS quantity,
    region,
    created_at
FROM READ_CSV_AUTO('{{SOURCE_PATH}}')
