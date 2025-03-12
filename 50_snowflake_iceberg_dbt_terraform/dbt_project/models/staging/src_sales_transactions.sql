{{
    config(
        materialized='view'
    )
}}

select
    transaction_id,
    sale_date,
    customer_id,
    product_id,
    quantity,
    unit_price,
    total_amount
from {{ source('glue_db', 'sales_transactions') }}
