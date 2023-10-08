create table event_sales_summary(
	eventname VARCHAR(200) not null,
	sellerid integer not null,
    total_sales decimal(19, 4),
	update_at timestamp,
    primary key (eventname)
);