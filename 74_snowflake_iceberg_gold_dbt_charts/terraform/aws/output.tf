output "ecr_repository_url" {
  description = "Repository to push the Lambda container image to"
  value       = module.dashboard_lambda.ecr_repository_url
}

output "dashboard_url" {
  description = "Dashboard URL"
  value       = module.dashboard_site.url
}
