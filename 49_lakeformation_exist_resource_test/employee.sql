-- データベース作成
CREATE DATABASE IF NOT EXISTS cm_kasama_hr_employee;
-- テーブル作成
CREATE EXTERNAL TABLE cm_kasama_hr_employee.personal_info (
    employee_id INT,
    first_name STRING,
    last_name STRING,
    department STRING,
    salary INT,
    hire_date DATE
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 's3://<任意のBucket名>/cm_kasama_hr_employee/personal_info/'
TBLPROPERTIES ('skip.header.line.count' = '1');
