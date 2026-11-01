variable "snowflake_account_identifier" {
  description = "<組織名>-<アカウント名>。HorizonのエンドポイントURLに使う"
  type        = string
}

variable "snowflake_role" {
  description = "Terraformが使うSnowflakeのロール。sql/setup.sqlで作る"
  type        = string
  default     = "CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE"
}
