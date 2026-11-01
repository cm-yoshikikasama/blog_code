terraform {
  required_version = ">= 1.10"

  required_providers {
    snowflake = {
      source = "snowflakedb/snowflake"
    }
  }
}
