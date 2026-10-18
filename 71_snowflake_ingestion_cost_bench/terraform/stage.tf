resource "snowflake_storage_integration_aws" "s3" {
  name                      = "CM_KASAMA_COST_BENCH_S3_INT"
  enabled                   = true
  storage_provider          = "S3"
  storage_allowed_locations = [local.data_url]
  storage_aws_role_arn      = local.role_arn
}

resource "snowflake_file_format" "csv" {
  database    = snowflake_database.bench.name
  schema      = snowflake_schema.bench.name
  name        = "CSV_FF"
  format_type = "CSV"
}

# s3://<バケット>/cost-bench/ を指すステージ。IAMロールができてから作る
resource "snowflake_stage_external_s3" "s3" {
  database            = snowflake_database.bench.name
  schema              = snowflake_schema.bench.name
  name                = "S3_STAGE"
  url                 = local.data_url
  storage_integration = snowflake_storage_integration_aws.s3.name

  file_format {
    format_name = snowflake_file_format.csv.fully_qualified_name
  }

  depends_on = [aws_iam_role.snowflake, aws_iam_role_policy.snowflake]
}
