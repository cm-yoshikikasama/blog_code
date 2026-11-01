variable "function_name" {
  description = "Lambda関数名。ECRのリポジトリ名にも使う"
  type        = string
}

variable "aws_iam_role_name" {
  description = "Lambdaの実行ロール名。snow-infra層がARNを組み立てたロール名と一致させる"
  type        = string
}

variable "output_bucket_arn" {
  description = "Lambdaが書き込むバケットのARN"
  type        = string
}

variable "environment_variables" {
  description = "Lambdaの環境変数"
  type        = map(string)
}
