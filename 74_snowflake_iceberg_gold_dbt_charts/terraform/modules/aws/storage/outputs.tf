output "bucket_name" {
  description = "バケット名"
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "バケットのARN"
  value       = aws_s3_bucket.this.arn
}

output "bucket_regional_domain_name" {
  description = "CloudFrontのオリジンに指定するドメイン名"
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}
