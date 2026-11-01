# 2層のstate(snow-infra / aws)のsnow-infra層。stateはこのディレクトリのterraform.tfstateに置く
# 適用順: snow-infra → aws(aws層がこの層の出力を使うため)
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
  # 組織名・アカウント名・ユーザー・秘密鍵はSNOWFLAKE_*環境変数で渡す(キーペア認証)
  # ロールはsql/setup.sqlで作るロール
  role = var.snowflake_role

  # service userのWORKLOAD_IDENTITYはexperimental扱い
  experimental_features_enabled = ["USER_ENABLE_DEFAULT_WORKLOAD_IDENTITY"]

  # Snowflakeのドライバーが送る利用統計を止める
  params = {
    CLIENT_TELEMETRY_ENABLED = "false"
  }
}

# AWSのアカウントIDを取得するためだけに使う。この層ではAWSのリソースを作らない
provider "aws" {
  region = "ap-northeast-1"
}
