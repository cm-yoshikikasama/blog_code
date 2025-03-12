# deploy手順

## 秘密鍵作成

```txt
cd ~/.ssh
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out snowflake_tf_snow_key.p8 -nocrypt
openssl rsa -in snowflake_tf_snow_key.p8 -pubout -out snowflake_tf_snow_key.pub
cat snowflake_tf_snow_key.pub | pbcopy
```

## AWS CLI設定

https://dev.classmethod.jp/articles/terraform-mfa-assumerole-export-credentials/

## Snowflakeで設定

```txt
CREATE USER "tf-snow"
	RSA_PUBLIC_KEY='${生成した公開鍵}'
	DEFAULT_ROLE=PUBLIC
	MUST_CHANGE_PASSWORD=FALSE;

GRANT ROLE ACCOUNTADMIN TO USER "tf-snow";

```

## 必要なツールのインストール


```txt
brew install terraform awscli
poetry add dbt-snowflake
aws configure
```



### 環境変数の設定

terraform.tfvars ファイルに必要な変数を設定します

```bash
snowflake_account  = "あなたのアカウント識別子"
snowflake_username = "あなたのユーザー名"
snowflake_password = "あなたのパスワード"
```


## deploy

```txt
cd terraform
terraform init
terraform fmt --recursive
terraform plan
terraform apply
```

## S3準備

```txt
aws s3api put-object --bucket cm-kasama-bs-data-dev --key athena/results/ --profile bs-role
aws s3api put-object --bucket cm-kasama-bs-data-dev --key raw/ --profile bs-role
aws s3api put-object --bucket cm-kasama-bs-data-dev --key iceberg/sales_transactions/ --profile bs-role
aws s3 cp ./scripts/sales_data.csv s3://cm-kasama-bs-data-dev/raw/ --profile bs-role
```


## dbt

```txt
# モデルの実行
dbt run

# テストの実行（テストを作成している場合）
dbt test

# 特定のモデルのみ実行
dbt run --models marts.daily_sales_summary
```
