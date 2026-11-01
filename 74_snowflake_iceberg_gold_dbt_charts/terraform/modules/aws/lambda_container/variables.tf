variable "function_name" {
  description = "Lambda function name. Also used as the ECR repository name"
  type        = string
}

variable "aws_iam_role_name" {
  description = "Execution role name. Must match the name snow-infra used to build the ARN"
  type        = string
}

variable "output_bucket_arn" {
  description = "ARN of the bucket that Lambda writes to"
  type        = string
}

variable "environment_variables" {
  description = "Lambda environment variables"
  type        = map(string)
}
