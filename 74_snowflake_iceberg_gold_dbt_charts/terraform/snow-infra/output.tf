# この層のoutputは、aws層がterraform_remote_stateで参照する

output "prefix" {
  description = "AWSのリソース名の接頭辞"
  value       = local.prefix
}

output "gold_bucket_name" {
  description = "goldのIcebergファイルを置くバケット"
  value       = local.gold_bucket_name
}

output "html_bucket_name" {
  description = "ダッシュボードのHTMLを置くバケット"
  value       = local.html_bucket_name
}

output "gold_role_name" {
  description = "External Volumeが使うIAMロール名"
  value       = local.gold_role_name
}

output "lambda_role_name" {
  description = "Lambdaの実行ロール名。service userに登録したARNと一致させる"
  value       = local.lambda_role_name
}

output "gold_storage_aws_iam_user_arn" {
  description = "External Volumeが生成したIAMユーザーのARN。goldのIAMロールの信頼ポリシーに使う"
  value       = module.external_volume.storage_aws_iam_user_arn
}

output "gold_storage_aws_external_id" {
  description = "External Volumeが生成したExternal ID。goldのIAMロールの信頼ポリシーに使う"
  value       = module.external_volume.storage_aws_external_id
}

# Lambdaの環境変数
output "horizon_url" {
  description = "HorizonのIceberg REST catalogのURL"
  # ホスト名の"_"はTLS証明書と一致しないため"-"にする
  value = "https://${lower(replace(var.snowflake_account_identifier, "_", "-"))}.snowflakecomputing.com/polaris/api/catalog"
}

output "database_name" {
  description = "HorizonのカタログとしてアタッチするSnowflakeのデータベース"
  value       = module.database.database_name
}

output "reader_role_name" {
  description = "Horizonのアクセストークンを取得するときのロール"
  value       = module.reader_role.role_name
}
