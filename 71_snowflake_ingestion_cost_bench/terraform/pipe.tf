# S3の cost-bench/snowpipe/<サイズ>/ に置かれたファイルを取り込むPipe
resource "snowflake_pipe" "orders" {
  for_each = var.sizes

  database    = snowflake_database.bench.name
  schema      = snowflake_schema.bench.name
  name        = "SNOWPIPE_${each.key}"
  auto_ingest = true

  copy_statement = <<-SQL
    COPY INTO ${snowflake_table.orders["SNOWPIPE_ORDERS_${each.key}"].fully_qualified_name}
    FROM @${snowflake_stage_external_s3.s3.fully_qualified_name}/snowpipe/${each.key}/
    FILE_FORMAT = (FORMAT_NAME = ${snowflake_file_format.csv.fully_qualified_name})
  SQL
}
