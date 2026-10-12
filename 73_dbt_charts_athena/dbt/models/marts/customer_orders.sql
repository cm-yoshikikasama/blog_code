select
    c.customer_id,
    c.first_name,
    c.last_name,
    count(o.order_id) as order_count,
    min(o.order_date) as first_order_date,
    max(o.order_date) as last_order_date
from {{ ref('stg_customers') }} as c
left join {{ ref('stg_orders') }} as o
    on c.customer_id = o.customer_id
group by c.customer_id, c.first_name, c.last_name
