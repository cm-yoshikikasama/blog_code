-- Insert data from source account to target account
-- Using registered Athena Data Catalog to access cross-account Glue Catalog
INSERT INTO ${TARGET_DATABASE}.sales_copy
SELECT * FROM ${SOURCE_CATALOG}.cm_kasama_cross_account_db.sales;
