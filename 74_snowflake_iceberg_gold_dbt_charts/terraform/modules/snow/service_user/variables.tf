variable "user_name" {
  description = "作成するservice user"
  type        = string
}

variable "role_name" {
  description = "service userに付けるロール(デフォルトロールにもする)"
  type        = string
}

variable "aws_iam_role_arn" {
  description = "service userとしてログインするIAMロールのARN。ロールはaws層があとで作る"
  type        = string
}
