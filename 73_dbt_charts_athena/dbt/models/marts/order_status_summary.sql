select
    status,
    count(*) as order_count
from {{ ref('stg_orders') }}
group by status
