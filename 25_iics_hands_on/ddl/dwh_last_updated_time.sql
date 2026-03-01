CREATE TABLE
last_updated_time (
    table_name VARCHAR(256) NOT NULL,  -- noqa: RF04
    last_updated TIMESTAMP NOT NULL,
    PRIMARY KEY (table_name)
);

-- 初期データのUpsert
INSERT INTO last_updated_time (table_name, last_updated)
VALUES
('event', '2000-01-01 00:00:00'),
('sales', '2000-01-01 00:00:00');
