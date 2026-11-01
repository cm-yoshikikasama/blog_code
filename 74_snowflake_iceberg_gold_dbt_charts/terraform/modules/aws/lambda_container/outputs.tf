output "ecr_repository_url" {
  description = "コンテナイメージのpush先"
  value       = aws_ecr_repository.this.repository_url
}

output "function_name" {
  description = "Lambda関数名"
  value       = aws_lambda_function.this.function_name
}
