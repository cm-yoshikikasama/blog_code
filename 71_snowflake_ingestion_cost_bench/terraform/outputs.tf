output "bucket_name" {
  description = "generate_data.pyの--bucketに渡す値"
  value       = aws_s3_bucket.data.id
}
