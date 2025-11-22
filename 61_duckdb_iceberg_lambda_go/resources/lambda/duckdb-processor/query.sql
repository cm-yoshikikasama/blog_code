SELECT
    id,
    date,
    CAST(sales_amount AS DECIMAL(10, 2)) as sales_amount,
    CAST(quantity AS INTEGER) as quantity,
    region,
    created_at
FROM read_csv_auto('{{SOURCE_PATH}}')
