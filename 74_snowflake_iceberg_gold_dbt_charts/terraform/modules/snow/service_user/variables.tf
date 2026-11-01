variable "user_name" {
  description = "Service user to create"
  type        = string
}

variable "role_name" {
  description = "Role granted to the service user (also its default role)"
  type        = string
}

variable "aws_iam_role_arn" {
  description = "ARN of the IAM role that logs in as the service user. The aws layer creates the role later"
  type        = string
}
