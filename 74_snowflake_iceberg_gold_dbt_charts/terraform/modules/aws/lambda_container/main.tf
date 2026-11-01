# Container image Lambda: ECR repository, execution role, and function
# force_delete lets destroy remove the images in this sample. Set it to false in production
resource "aws_ecr_repository" "this" {
  name         = var.function_name
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Look up the digest of the pushed latest tag. Lambda refers to the image by digest, not by tag
# Applying after a new push changes the digest, so the function image is updated
data "aws_ecr_image" "latest" {
  repository_name = aws_ecr_repository.this.name
  image_tag       = "latest"
}

# snow-infra decides the role name and registers this role's ARN on the service user
resource "aws_iam_role" "this" {
  name = var.aws_iam_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Allow only writes to the output bucket. No access to the gold bucket: gold is read with temporary credentials vended by Horizon
resource "aws_iam_role_policy" "output" {
  name = "${var.aws_iam_role_name}-output"
  role = aws_iam_role.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = "${var.output_bucket_arn}/*"
    }]
  })
}

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = aws_iam_role.this.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.this.repository_url}@${data.aws_ecr_image.latest.image_digest}"
  architectures = ["arm64"]
  memory_size   = 2048
  timeout       = 300

  environment {
    variables = var.environment_variables
  }

  depends_on = [aws_iam_role_policy_attachment.logs]
}
