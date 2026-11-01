# gold: Iceberg files of the gold tables. Snowflake writes them through the external volume
module "gold" {
  source = "../modules/aws/storage"

  aws_s3_bucket_name = local.infra.gold_bucket_name
  snowflake_access = {
    aws_iam_role_name      = local.infra.gold_role_name
    snowflake_iam_user_arn = local.infra.gold_storage_aws_iam_user_arn
    snowflake_external_id  = local.infra.gold_storage_aws_external_id
    allow_writes           = true
  }
}

# html: dashboard. Lambda writes it and CloudFront serves it
module "html" {
  source = "../modules/aws/storage"

  aws_s3_bucket_name = local.infra.html_bucket_name
}
