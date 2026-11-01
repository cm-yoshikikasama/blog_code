variable "external_volume_name" {
  description = "作成するExternal Volume"
  type        = string
}

variable "aws_iam_role_arn" {
  description = "External Volumeが使うIAMロールのARN。ロールはaws層があとで作る"
  type        = string
}

variable "s3_url" {
  description = "Icebergのファイルを置くS3のURL(s3://<バケット>/)"
  type        = string
}
