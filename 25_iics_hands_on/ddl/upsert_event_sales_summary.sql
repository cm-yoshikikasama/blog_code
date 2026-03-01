WITH last_updated_sales AS (
    SELECT last_updated
    FROM last_updated_time
    WHERE table_name = 'sales'
),

last_updated_event AS (
    SELECT last_updated
    FROM last_updated_time
    WHERE table_name = 'event'
)

SELECT
    e.eventname,
    s.sellerid,
    SUM(s.pricepaid * s.qtysold) AS total_sales
FROM
    sales AS s
INNER JOIN event AS e ON s.eventid = e.eventid
INNER JOIN last_updated_sales AS lus ON s.update_at > lus.last_updated
INNER JOIN last_updated_event AS lue ON e.update_at > lue.last_updated
WHERE
    e.catid = '9'
GROUP BY
    e.eventname,
    s.sellerid
ORDER BY
    total_sales DESC;
