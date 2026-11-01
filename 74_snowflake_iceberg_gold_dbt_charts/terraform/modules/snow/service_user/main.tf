# パスワードもPATも持たないservice user
# AWSのIAMロールのARNを登録しておき、そのロールの認証情報(GetCallerIdentityの署名)でログインする
resource "snowflake_service_user" "this" {
  name         = var.user_name
  default_role = var.role_name

  default_workload_identity {
    aws {
      arn = var.aws_iam_role_arn
    }
  }
}

resource "snowflake_grant_account_role" "this" {
  role_name = var.role_name
  user_name = snowflake_service_user.this.name
}
