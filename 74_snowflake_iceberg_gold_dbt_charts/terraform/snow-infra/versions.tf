# snow-infra layer of the two-layer state (snow-infra / aws). State is stored in terraform.tfstate in this directory
# Apply order: snow-infra, then aws (the aws layer uses this layer's outputs)
terraform {
  required_version = ">= 1.10"

  required_providers {
    snowflake = {
      source  = "snowflakedb/snowflake"
      version = "~> 2.22"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "snowflake" {
  # Organization, account, user, and private key come from SNOWFLAKE_* environment variables (key-pair auth)
  # The role is created by sql/setup.sql
  role = var.snowflake_role

  # WORKLOAD_IDENTITY on service users is experimental
  experimental_features_enabled = ["USER_ENABLE_DEFAULT_WORKLOAD_IDENTITY"]

  # Stop usage stats sent by the Snowflake driver
  params = {
    CLIENT_TELEMETRY_ENABLED = "false"
  }
}

# Used only to get the AWS account ID. This layer creates no AWS resources
provider "aws" {
  region = "ap-northeast-1"
}
