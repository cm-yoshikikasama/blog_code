{{
    config(
        materialized='table',
        cluster_by=['sale_date']
    )
}}

with daily_sales as (
    select
        sale_date,
        count(distinct transaction_id) as total_transactions,
        count(distinct customer_id) as unique_customers,
        sum(quantity) as total_items_sold,
        sum(total_amount) as total_revenue,
        avg(total_amount) as avg_transaction_value
    from {{ ref('src_sales_transactions') }}
    group by sale_date
)

select * from daily_sales
