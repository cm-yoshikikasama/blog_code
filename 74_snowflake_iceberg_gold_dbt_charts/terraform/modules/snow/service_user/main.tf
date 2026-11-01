# Service user with no password and no PAT
# Registers an AWS IAM role ARN and logs in with that role's credentials (a signed GetCallerIdentity request)
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
