module "dashboard_site" {
  source = "../modules/aws/cloudfront_site"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name                        = "${local.infra.prefix}-html"
  bucket_name                 = module.html.bucket_name
  bucket_arn                  = module.html.bucket_arn
  bucket_regional_domain_name = module.html.bucket_regional_domain_name
  allowed_cidrs               = var.allowed_cidrs

  # パブリックアクセスブロックを設定してからバケットポリシーを付ける
  depends_on = [module.html]
}
