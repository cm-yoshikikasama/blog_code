output "url" {
  description = "ディストリビューションのURL"
  value       = "https://${aws_cloudfront_distribution.this.domain_name}/"
}
