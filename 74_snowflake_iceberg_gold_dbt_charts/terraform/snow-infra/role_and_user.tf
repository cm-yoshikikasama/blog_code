# Role and user that Lambda uses to read gold

# Role with only SELECT on the gold Iceberg tables
module "reader_role" {
  source = "../modules/snow/reader_role"

  role_name                   = "CM_KASAMA_ICEBERG_BI_READER"
  database_name               = module.database.database_name
  schema_fully_qualified_name = module.database.schema_fully_qualified_names["GOLD"]
}

# Snowflake user for Lambda. Lambda logs in with its execution role credentials
module "dashboard_user" {
  source = "../modules/snow/service_user"

  user_name        = "CM_KASAMA_ICEBERG_BI_DASHBOARD_SVC"
  role_name        = module.reader_role.role_name
  aws_iam_role_arn = "arn:aws:iam::${local.account_id}:role/${local.lambda_role_name}"
}

