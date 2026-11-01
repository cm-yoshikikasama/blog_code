# goldのIcebergテーブルのファイルを置くExternal Volume。S3とIAMロールはaws層が作る
#
# 適用順はsnow-infra → aws。External Volumeとservice userはIAMロールのARNを文字列で受け取り、
# ロールの実在を使うときまで検証しない。そのため、この層がARNを組み立ててSnowflakeのオブジェクトを先に作り、
# Snowflakeが生成するIAMユーザーとExternal IDをoutputでaws層の信頼ポリシーに渡す

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  prefix     = "cm-kasama-iceberg-bi"

  # AWS側のリソース名はこの層で決め、outputでaws層へ渡す
  # (この層が組み立てるARNと、aws層が実際に作るIAMロール名のズレを防ぐ)
  gold_bucket_name = "${local.prefix}-gold-${local.account_id}"
  html_bucket_name = "${local.prefix}-html-${local.account_id}"

  gold_role_name   = "${local.prefix}-snowflake-gold-role"
  lambda_role_name = "${local.prefix}-dashboard-lambda-role"
}

# goldのIcebergテーブルのデータとメタデータを置く場所。dbtのgoldモデルが指定する
module "external_volume" {
  source = "../modules/snow/external_volume"

  external_volume_name = "CM_KASAMA_ICEBERG_BI_GOLD_VOL"
  aws_iam_role_arn     = "arn:aws:iam::${local.account_id}:role/${local.gold_role_name}"
  s3_url               = "s3://${local.gold_bucket_name}/"
}
