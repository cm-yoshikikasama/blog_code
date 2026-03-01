CREATE TABLE event_sales_summary (
    eventname VARCHAR(200) NOT NULL,
    sellerid INTEGER NOT NULL,
    total_sales DECIMAL(19, 4),
    update_at TIMESTAMP,
    PRIMARY KEY (eventname)
);
