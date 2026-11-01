# snow-infra層の出力を使う。リソース名、Snowflakeが生成したIAMユーザーとExternal ID、Lambdaの環境変数の値を受け取る
data "terraform_remote_state" "infra" {
  backend = "local"

  config = {
    path = "${path.module}/../snow-infra/terraform.tfstate"
  }
}

locals {
  infra = data.terraform_remote_state.infra.outputs
}
