MERGE INTO cm_kasama_retail_sales_db.sales_transactions t
USING cm_kasama_retail_sales_db.raw_sales_data s
ON t.transaction_id = s.transaction_id
WHEN MATCHED THEN
  UPDATE SET
    sale_date = source.sale_date,
    customer_id = source.customer_id,
    product_id = source.product_id,
    quantity = source.quantity,
    unit_price = source.unit_price,
    total_amount = source.total_amount,
    sale_year = source.sale_date,
    sale_month = source.sale_date
WHEN NOT MATCHED THEN
  INSERT (
    transaction_id,
    sale_date,
    customer_id,
    product_id,
    quantity,
    unit_price,
    total_amount,
    sale_year,
    sale_month
  )
  VALUES (
    source.transaction_id,
    source.sale_date,
    source.customer_id,
    source.product_id,
    source.quantity,
    source.unit_price,
    source.total_amount,
    source.sale_date,
    source.sale_date
  );
