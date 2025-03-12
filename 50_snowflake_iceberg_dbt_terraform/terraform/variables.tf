# 共通
variable "project_name" {
  description = "Project name"
  default     = "cm-kasama-bs"
}
variable "environment" {
  description = "Environment (dev/stg/prod)"
  default     = "dev"
}

# AWS
variable "aws_profile" {
  description = "aws_profile"
}
variable "aws_region" {
  description = "aws_region"
}

# Snowflake
variable "snowflake_organization_name" {
  type = string
}

variable "snowflake_account_name" {
  type = string
}

variable "snowflake_username" {
  description = "Snowflake username"
}

variable "snowflake_private_key_path" {
  description = "Snowflake key path"
}
