# S3バケットと、Snowflakeがそのバケットにアクセスするときに使うIAMロール
# 信頼ポリシーのPrincipalとExternal IDは、snow-infra層で先に作ったStorage IntegrationかExternal Volumeが生成した値を使う
# snowflake_accessを指定しないとIAMロールは作らない
resource "aws_s3_bucket" "this" {
  bucket        = var.aws_s3_bucket_name
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role" "snowflake" {
  count = var.snowflake_access == null ? 0 : 1

  name = var.snowflake_access.aws_iam_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = var.snowflake_access.snowflake_iam_user_arn }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "sts:ExternalId" = var.snowflake_access.snowflake_external_id }
      }
    }]
  })
}

resource "aws_iam_role_policy" "snowflake" {
  count = var.snowflake_access == null ? 0 : 1

  name = "${var.snowflake_access.aws_iam_role_name}-s3"
  role = aws_iam_role.snowflake[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        # 書き込みを許可するときだけPutとDeleteを付ける
        Action = concat(
          ["s3:GetObject", "s3:GetObjectVersion"],
          var.snowflake_access.allow_writes ? ["s3:PutObject", "s3:DeleteObject", "s3:DeleteObjectVersion"] : [],
        )
        Resource = "${aws_s3_bucket.this.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = aws_s3_bucket.this.arn
      }
    ]
  })
}
