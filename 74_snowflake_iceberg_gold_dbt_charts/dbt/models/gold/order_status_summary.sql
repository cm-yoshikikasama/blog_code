select
    status,
    count(*) as order_count
from {{ ref('raw_orders') }}
group by status
