terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    snowflake = {
      source  = "snowflakedb/snowflake"
      version = "~> 2.18"
    }
  }
  # stateはこのディレクトリのterraform.tfstateに置く(.gitignoreで除外)
}
