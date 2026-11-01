output "external_volume_name" {
  description = "External Volume名。dbtのIcebergモデルが指定する"
  value       = snowflake_external_volume.this.name
}

# Snowflakeが生成するIAMユーザーとExternal ID。aws層がIAMロールの信頼ポリシーに使う
output "storage_aws_iam_user_arn" {
  description = "Snowflake側が生成したIAMユーザーのARN"
  value       = local.s3_location.storage_aws_iam_user_arn
}

output "storage_aws_external_id" {
  description = "Snowflake側が生成したExternal ID"
  value       = local.s3_location.storage_aws_external_id
}
