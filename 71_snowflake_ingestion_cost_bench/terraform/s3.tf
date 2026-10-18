resource "aws_s3_bucket" "data" {
  bucket        = local.bucket_name
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# snowpipe/<サイズ>/ にファイルが置かれたら、そのサイズのPipeに通知する
resource "aws_s3_bucket_notification" "data" {
  bucket = aws_s3_bucket.data.id

  dynamic "queue" {
    for_each = snowflake_pipe.orders
    content {
      queue_arn     = queue.value.notification_channel
      events        = ["s3:ObjectCreated:*"]
      filter_prefix = "cost-bench/snowpipe/${queue.key}/"
    }
  }
}
