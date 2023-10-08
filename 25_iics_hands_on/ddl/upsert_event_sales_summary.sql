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
  sales s
  JOIN event e ON s.eventid = e.eventid
  JOIN last_updated_sales lus ON s.update_at > lus.last_updated
  JOIN last_updated_event lue ON e.update_at > lue.last_updated
WHERE
  e.catid = '9'
GROUP BY
  e.eventname,
  s.sellerid
ORDER BY
  total_sales DESC;