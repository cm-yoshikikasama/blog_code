# データベース
resource "snowflake_database" "analytics" {
  provider = snowflake.accountadmin
  name     = "snowflake_dbt"
  comment  = "Analytics database"
}

# スキーマ
resource "snowflake_schema" "raw" {
  provider = snowflake.accountadmin
  database = snowflake_database.analytics.name
  name     = "RAW"
}

resource "snowflake_schema" "staging" {
  provider = snowflake.accountadmin
  database = snowflake_database.analytics.name
  name     = "STAGING"
}


# AWS 統合の設定
resource "snowflake_storage_integration" "aws_integration" {
  provider                  = snowflake.accountadmin
  name                      = upper("${var.project_name}_AWS_INTEGRATION")
  type                      = "EXTERNAL_STAGE"
  enabled                   = true
  storage_provider          = "S3"
  storage_aws_role_arn      = "arn:aws:iam::${local.account_id}:role/snowflake-access-role"
  storage_allowed_locations = ["s3://${aws_s3_bucket.data_bucket.bucket}/"]
}

# 外部ステージの作成
resource "snowflake_stage" "external_stage" {
  provider            = snowflake.accountadmin
  name                = upper("${var.project_name}_EXTERNAL_STAGE")
  url                 = "s3://${aws_s3_bucket.data_bucket.bucket}/"
  database            = snowflake_database.analytics.name
  schema              = snowflake_schema.raw.name
  storage_integration = snowflake_storage_integration.aws_integration.name
}
