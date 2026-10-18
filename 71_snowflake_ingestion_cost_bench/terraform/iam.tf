# SnowflakeがS3のデータを読むためのIAMロール。信頼ポリシーにStorage Integrationの値を使う
resource "aws_iam_role" "snowflake" {
  name = local.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = snowflake_storage_integration_aws.s3.describe_output[0].iam_user_arn }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "sts:ExternalId" = snowflake_storage_integration_aws.s3.describe_output[0].external_id }
      }
    }]
  })
}

resource "aws_iam_role_policy" "snowflake" {
  name = "cm-kasama-cost-bench-s3-read"
  role = aws_iam_role.snowflake.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion"]
        Resource = "${aws_s3_bucket.data.arn}/cost-bench/*"
      },
      {
        Effect    = "Allow"
        Action    = ["s3:ListBucket"]
        Resource  = aws_s3_bucket.data.arn
        Condition = { StringLike = { "s3:prefix" = ["cost-bench/*"] } }
      }
    ]
  })
}
