variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "sizes" {
  description = "計測するデータサイズ。S3のフォルダ名とオブジェクト名に使う"
  type        = set(string)
  default     = ["10MB", "100MB", "1GB"]
}

data "aws_caller_identity" "current" {}

locals {
  bucket_name = "cm-kasama-cost-bench-data-${data.aws_caller_identity.current.account_id}"
  role_name   = "cm-kasama-cost-bench-snowflake-storage-role"
  # Storage IntegrationとIAMロールが互いを参照するため、ロールARNは文字列で組み立てる
  role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.role_name}"
  data_url = "s3://${local.bucket_name}/cost-bench/"
}
