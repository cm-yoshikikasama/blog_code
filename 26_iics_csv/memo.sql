CREATE TABLE IF NOT EXISTS memo (
    seq BIGINT,
    memo VARCHAR(100),
    update_at TIMESTAMP
)
DISTSTYLE AUTO
SORTKEY AUTO;


-- inserted data
INSERT INTO memo (seq, memo, update_at) VALUES
(1, '①テスト', '2024-01-01 00:00:00'),
(2, 'test2\\hoge', '2024-01-01 00:00:00'),
(3, 'test3"', '2024-01-01 00:00:00'),
(4, 'test4,', '2024-01-01 00:00:00');
