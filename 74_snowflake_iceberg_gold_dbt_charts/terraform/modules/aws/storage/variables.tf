variable "aws_s3_bucket_name" {
  description = "作成するS3バケット"
  type        = string
}

variable "snowflake_access" {
  description = "Snowflakeがこのバケットにアクセスするときに使うIAMロール。aws_iam_role_nameはsnow-infra層がARNを組み立てたロール名と一致させる"
  type = object({
    aws_iam_role_name      = string
    snowflake_iam_user_arn = string
    snowflake_external_id  = string
    allow_writes           = bool
  })
  default = null
}
