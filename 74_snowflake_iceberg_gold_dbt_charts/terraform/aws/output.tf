output "ecr_repository_url" {
  description = "Lambdaのコンテナイメージのpush先"
  value       = module.dashboard_lambda.ecr_repository_url
}

output "dashboard_url" {
  description = "ダッシュボードのURL"
  value       = module.dashboard_site.url
}
