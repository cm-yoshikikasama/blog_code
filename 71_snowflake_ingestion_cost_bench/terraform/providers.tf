provider "aws" {
  region = var.aws_region
}

provider "snowflake" {
  # 組織名・アカウント名・ユーザー・認証情報はSNOWFLAKE_*環境変数で渡す
  role = "ACCOUNTADMIN"

  # terraform-provider-snowflakeでPreview扱いのリソースを有効化する
  preview_features_enabled = [
    "snowflake_external_table_resource",
    "snowflake_pipe_resource",
    "snowflake_file_format_resource",
    "snowflake_table_resource",
  ]
}
