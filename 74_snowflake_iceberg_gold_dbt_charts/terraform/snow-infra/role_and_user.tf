# ロールとユーザー。Lambdaがgoldを読むときに使う

# goldのIcebergテーブルのSELECTだけを持つロール
module "reader_role" {
  source = "../modules/snow/reader_role"

  role_name                   = "CM_KASAMA_ICEBERG_BI_READER"
  database_name               = module.database.database_name
  schema_fully_qualified_name = module.database.schema_fully_qualified_names["GOLD"]
}

# Lambdaが使うSnowflakeのユーザー。Lambdaは実行ロールの認証情報でログインする
module "dashboard_user" {
  source = "../modules/snow/service_user"

  user_name        = "CM_KASAMA_ICEBERG_BI_DASHBOARD_SVC"
  role_name        = module.reader_role.role_name
  aws_iam_role_arn = "arn:aws:iam::${local.account_id}:role/${local.lambda_role_name}"
}

