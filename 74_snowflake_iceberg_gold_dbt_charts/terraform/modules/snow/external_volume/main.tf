# Snowflake-managed Icebergテーブルのデータとメタデータを置く場所
# Storage Integrationと同じく、IAMロールARNを文字列で受け取るので、ロールより先に作れる
resource "snowflake_external_volume" "this" {
  name         = var.external_volume_name
  allow_writes = "true"

  storage_location {
    storage_location_name = "s3"
    storage_provider      = "S3"
    storage_base_url      = var.s3_url
    storage_aws_role_arn  = var.aws_iam_role_arn
  }
}

locals {
  s3_location = snowflake_external_volume.this.describe_output[0].storage_locations[0].s3_storage_location[0]
}
