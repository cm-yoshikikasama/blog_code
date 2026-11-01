variable "external_volume_name" {
  description = "External volume to create"
  type        = string
}

variable "aws_iam_role_arn" {
  description = "ARN of the IAM role used by the external volume. The aws layer creates the role later"
  type        = string
}

variable "s3_url" {
  description = "S3 URL for the Iceberg files (s3://<bucket>/)"
  type        = string
}
