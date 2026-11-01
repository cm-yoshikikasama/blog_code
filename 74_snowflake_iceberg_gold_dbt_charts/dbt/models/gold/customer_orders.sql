with order_amounts as (
    select
        order_id,
        sum(amount) / 100 as amount
    from {{ ref('raw_payments') }}
    group by order_id
)

select
    c.id as customer_id,
    c.first_name,
    c.last_name,
    count(o.id) as order_count,
    min(o.order_date) as first_order_date,
    max(o.order_date) as last_order_date,
    cast(coalesce(sum(a.amount), 0) as number(18, 2)) as total_amount
from {{ ref('raw_customers') }} as c
left join {{ ref('raw_orders') }} as o
    on c.id = o.user_id
left join order_amounts as a
    on o.id = a.order_id
group by c.id, c.first_name, c.last_name
