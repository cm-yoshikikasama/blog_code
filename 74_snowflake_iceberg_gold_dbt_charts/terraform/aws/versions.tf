# 3層のstateのaws層。AWSのリソースだけを管理し、snowflake providerを持たない
terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

# CloudFrontに付けるWAFはus-east-1にしか作れない
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
