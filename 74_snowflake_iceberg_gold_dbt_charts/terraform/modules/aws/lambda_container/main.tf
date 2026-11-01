# コンテナイメージのLambda。ECRリポジトリ・実行ロール・関数を作る
# force_deleteはサンプルをdestroyでイメージごと消すため。本番ではfalseにする
resource "aws_ecr_repository" "this" {
  name         = var.function_name
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# pushしたlatestのdigestを取得し、Lambdaはタグではなくdigestでイメージを指定する
# 新しいイメージをpushしてからapplyすると、digestが変わるのでLambdaのイメージも更新される
data "aws_ecr_image" "latest" {
  repository_name = aws_ecr_repository.this.name
  image_tag       = "latest"
}

# ロール名はsnow-infra層が決める。snow-infra層はこのロールのARNをservice userに登録する
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

# 出力先のバケットへの書き込みだけを許可する。goldバケットへの権限は付けない。goldはHorizonが払い出す一時的な認証情報で読む
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
