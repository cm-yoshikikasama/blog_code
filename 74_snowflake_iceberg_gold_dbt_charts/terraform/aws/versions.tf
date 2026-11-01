# aws layer of the two-layer state. Manages only AWS resources and has no Snowflake provider
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

# WAF for CloudFront can be created only in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
