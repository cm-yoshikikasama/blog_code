output "ecr_repository_url" {
  description = "Repository to push the container image to"
  value       = aws_ecr_repository.this.repository_url
}

output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.this.function_name
}
