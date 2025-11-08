# 58_cross_account_glue_athena

クロスアカウントで Glue Data Catalog へ Athena でアクセスし、INSERT INTO でデータをコピーする検証環境

## 概要

このプロジェクトは、Athena の INSERT INTO を使用して、Source Account の Glue Data Catalog データを Target Account にコピーする構成を実装します。

- Source Account（データソースアカウント）: CloudFormation + SQL で実装
  - S3 バケット（サンプル CSV データ格納用）
  - Glue Database & Table（SQL で作成）
  - Glue Catalog Resource Policy（Target Account からのアクセスを許可）
- Target Account（分析基盤アカウント）: CDK で実装
  - Step Functions（Athena INSERT クエリ実行ワークフロー）
  - IAM ロール（Source Catalog へのアクセス権限）
  - S3 バケット（コピーしたデータの格納用）
  - Glue Database & Table（コピー先テーブル、SQL で作成）
  - Athena Workgroup（AWS Managed Storage 使用）
  - Athena Data Catalog（Source Catalog 参照）

## 前提条件

- 2 つの AWS アカウント（Source & Target）
- AWS CLI 設定済み
- Node.js 18 以上（CDK 用）
- AWS CDK v2 インストール済み

## デプロイ手順

### Step 1: Target Account - CDK デプロイ

IAM Role を先に作成するため、Target Account から先にデプロイします。

```bash
cd cdk

# 依存関係のインストール
npm install

# CDK Deploy
npx cdk deploy \
  --context sourceAccountId=<SOURCE_ACCOUNT_ID> \
  --require-approval never \
  --profile <TARGET_ACCOUNT_PROFILE>
```

### Step 2: Source Account - S3 バケット作成

```bash
cd source

aws cloudformation create-stack \
  --stack-name cm-kasama-cross-account-s3 \
  --template-body file://s3.yml \
  --parameters \
    ParameterKey=TargetAccountId,ParameterValue=<TARGET_ACCOUNT_ID> \
    ParameterKey=EnvName,ParameterValue=dev \
  --profile <SOURCE_ACCOUNT_PROFILE>
```

### Step 3: Source Account - サンプルデータアップロード

```bash
aws s3 cp sample-data/sales.csv s3://<SOURCE_BUCKET_NAME>/data/sales.csv \
  --profile <SOURCE_ACCOUNT_PROFILE>
```

### Step 4: Source Account - Glue Database & Table 作成

Athena コンソールで `source/create-database-and-table.sql` の SQL を実行します。

### Step 5: Target Account - Glue Database & Table 作成

Athena コンソールで `target/create-database-and-table.sql` の SQL を実行します。

### Step 6: Source Account - Glue Catalog Resource Policy 設定

`source/glue-resource-policy.json` を編集し、`<TARGET_ACCOUNT_ID>`, `<SOURCE_ACCOUNT_ID>` を実際の値に置き換えます。

AWS CLI で設定：

```bash
aws glue put-resource-policy \
  --policy-in-json file://glue-resource-policy.json \
  --profile <SOURCE_ACCOUNT_PROFILE>
```

## クリーンアップ

```bash
# 1. Target Account: Glue Database 削除（Athena コンソール）
# DROP DATABASE IF EXISTS cm_kasama_cross_account_target_db CASCADE;

# 2. Target Account: Athena Workgroup 削除（マネジメントコンソール）
# Athena コンソール > Workgroups > cm-kasama-cross-account-dev-target-workgroup を選択
# Delete をクリック
# 注意: クエリ履歴が残っているため、CDK destroy 前に手動削除が必要

# 3. Target Account: CDK スタック削除
cd cdk
npx cdk destroy \
  --context sourceAccountId=<SOURCE_ACCOUNT_ID> \
  --profile <TARGET_ACCOUNT_PROFILE>

# 4. Source Account: Glue Catalog Resource Policy 削除
aws glue delete-resource-policy --profile <SOURCE_ACCOUNT_PROFILE>

# 5. Source Account: Glue Database 削除（Athena コンソール）
# DROP DATABASE IF EXISTS cm_kasama_cross_account_db CASCADE;

# 6. Source Account: S3 バケットとスタック削除
aws s3 rb s3://<SOURCE_BUCKET_NAME> --force --profile <SOURCE_ACCOUNT_PROFILE>

aws cloudformation delete-stack \
  --stack-name <STACK_NAME> \
  --profile <SOURCE_ACCOUNT_PROFILE>
```
