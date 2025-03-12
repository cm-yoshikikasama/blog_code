terraform {
  required_providers {
    snowflake = {
      source = "Snowflake-Labs/snowflake"
    }
  }
}
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

provider "snowflake" {
  alias             = "accountadmin"
  organization_name = var.snowflake_organization_name
  account_name      = var.snowflake_account_name
  user              = var.snowflake_username
  private_key       = file(pathexpand(var.snowflake_private_key_path))
  role              = "ACCOUNTADMIN"
  authenticator     = "SNOWFLAKE_JWT"
}
