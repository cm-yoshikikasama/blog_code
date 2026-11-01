# External volume for the gold Iceberg table files. The aws layer creates the S3 bucket and IAM role
#
# Apply order: snow-infra, then aws. The external volume and service user take IAM role ARNs as strings
# and do not check that the roles exist until use. So this layer builds the ARNs, creates the Snowflake objects first,
# and passes the generated IAM user and external ID to the aws layer trust policy through outputs

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  prefix     = "cm-kasama-iceberg-bi"

  # This layer decides the AWS resource names and passes them to the aws layer through outputs
  # (so the ARNs built here match the IAM roles the aws layer creates)
  gold_bucket_name = "${local.prefix}-gold-${local.account_id}"
  html_bucket_name = "${local.prefix}-html-${local.account_id}"

  gold_role_name   = "${local.prefix}-snowflake-gold-role"
  lambda_role_name = "${local.prefix}-dashboard-lambda-role"
}

# Location of the gold Iceberg data and metadata. The dbt gold models refer to it
module "external_volume" {
  source = "../modules/snow/external_volume"

  external_volume_name = "CM_KASAMA_ICEBERG_BI_GOLD_VOL"
  aws_iam_role_arn     = "arn:aws:iam::${local.account_id}:role/${local.gold_role_name}"
  s3_url               = "s3://${local.gold_bucket_name}/"
}
