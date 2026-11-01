variable "snowflake_account_identifier" {
  description = "<organization-name>-<account-name>. Used in the Horizon endpoint URL"
  type        = string
}

variable "snowflake_role" {
  description = "Snowflake role used by Terraform. Created by sql/setup.sql"
  type        = string
  default     = "CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE"
}
