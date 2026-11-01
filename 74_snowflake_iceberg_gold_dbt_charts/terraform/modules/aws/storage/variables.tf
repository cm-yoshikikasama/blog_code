variable "aws_s3_bucket_name" {
  description = "S3 bucket to create"
  type        = string
}

variable "snowflake_access" {
  description = "IAM role that Snowflake uses to access this bucket. aws_iam_role_name must match the name snow-infra used to build the ARN"
  type = object({
    aws_iam_role_name      = string
    snowflake_iam_user_arn = string
    snowflake_external_id  = string
    allow_writes           = bool
  })
  default = null
}
