select
    payment_method,
    count(*) as payment_count,
    cast(sum(amount) / 100 as number(18, 2)) as amount
from {{ ref('raw_payments') }}
group by payment_method
