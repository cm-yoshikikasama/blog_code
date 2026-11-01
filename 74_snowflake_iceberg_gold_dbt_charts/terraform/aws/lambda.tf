# dct renderでダッシュボードのHTMLを作るLambda
module "dashboard_lambda" {
  source = "../modules/aws/lambda_container"

  function_name     = "${local.infra.prefix}-dashboard"
  aws_iam_role_name = local.infra.lambda_role_name
  output_bucket_arn = module.html.bucket_arn

  environment_variables = {
    HORIZON_URL     = local.infra.horizon_url
    HORIZON_CATALOG = local.infra.database_name
    HORIZON_ROLE    = local.infra.reader_role_name
    HTML_BUCKET     = module.html.bucket_name
  }
}
