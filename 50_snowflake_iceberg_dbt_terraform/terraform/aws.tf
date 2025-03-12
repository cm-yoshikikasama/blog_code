data "aws_caller_identity" "current" {}

locals {
  account_id  = data.aws_caller_identity.current.account_id
  bucket_name = "${var.project_name}-data-${var.environment}"
}

# S3バケット
resource "aws_s3_bucket" "data_bucket" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_versioning" "data_bucket_versioning" {
  bucket = aws_s3_bucket.data_bucket.id
  versioning_configuration {
    status = "Disabled"
  }
}

# Glueデータベース
resource "aws_glue_catalog_database" "sales_db" {
  name = "cm_kasama_retail_sales_db"
}

# Athenaワークグループ
resource "aws_athena_workgroup" "sales_wg" {
  name = "retail_sales_wg"
  configuration {
    result_configuration {
      output_location = "s3://${aws_s3_bucket.data_bucket.bucket}/athena/results/"
    }
  }
}

# IAMロール
resource "aws_iam_role" "sfn_role" {
  name = "${var.project_name}-sfn-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })
}
# IAMポリシー
resource "aws_iam_role_policy" "sfn_policy" {
  name = "${var.project_name}-sfn-policy-${var.environment}"
  role = aws_iam_role.sfn_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.data_bucket.arn,
          "${aws_s3_bucket.data_bucket.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetDatabase",
          "glue:GetTable",
          "glue:GetPartitions",
          "glue:UpdateTable"
        ]
        Resource = [
          "arn:aws:glue:${var.aws_region}:${data.aws_caller_identity.current.account_id}:catalog",
          "arn:aws:glue:${var.aws_region}:${data.aws_caller_identity.current.account_id}:database/${aws_glue_catalog_database.sales_db.name}",
          "arn:aws:glue:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${aws_glue_catalog_database.sales_db.name}/*"
        ]
      }
    ]
  })
}
# Step Functions
resource "aws_sfn_state_machine" "sales_workflow" {
  name     = "${var.project_name}-workflow-${var.environment}"
  role_arn = aws_iam_role.sfn_role.arn

  definition = jsonencode({
    Comment = "Merge data into Iceberg table"
    StartAt = "MergeToIceberg"
    States = {
      MergeToIceberg = {
        Type     = "Task"
        Resource = "arn:aws:states:::athena:startQueryExecution.sync"
        Parameters = {
          QueryString = templatefile("${path.module}/../scripts/merge_to_iceberg.sql", {
            database = aws_glue_catalog_database.sales_db.name
          })
          QueryExecutionContext = {
            Database = aws_glue_catalog_database.sales_db.name
          }
          ResultConfiguration = {
            OutputLocation = "s3://${aws_s3_bucket.data_bucket.bucket}/athena/results/"
          }
          WorkGroup = aws_athena_workgroup.sales_wg.name
        }
        End = true
      }
    }
  })
}


# snowflake iam role
resource "aws_iam_role" "snowflake_access_role" {
  name = "snowflake-access-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        AWS = "*" # 初期設定では広く設定し、後で更新
        # AWS = snowflake_storage_integration.aws_integration.storage_aws_external_id
      },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "snowflake_access_policy" {
  name = "snowflake-access-policy"
  role = aws_iam_role.snowflake_access_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      Resource = [
        aws_s3_bucket.data_bucket.arn,
        "${aws_s3_bucket.data_bucket.arn}/*"
      ]
    }]
  })
}
