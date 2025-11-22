# Lambda(Go) + DuckDB + Iceberg によるクロスアカウントデータ処理

AWS Lambda(Go)でDuckDB v1.4.2とIceberg拡張機能を使用し、クロスアカウントS3からAWS Glue Catalog管理のIcebergテーブルへデータを処理するサンプル実装です。

## アーキテクチャ

```txt
┌─────────────────┐
│  Source Account │
│   S3 Bucket     │ (クロスアカウント)
│   CSV Files     │
└────────┬────────┘
         │ S3 Bucket Policy
         ▼
┌────────────────────────────────┐
│   Lambda(Go) ARM64             │
│   ┌──────────────────────┐     │
│   │  DuckDB + Iceberg    │     │
│   │  - read_csv_auto()   │     │
│   │  - INSERT INTO       │     │
│   └──────────────────────┘     │
└────────────┬───────────────────┘
             │
             ▼
      ┌─────────────┐
      │ Glue Catalog│
      │   Iceberg   │
      │   Table     │
      └─────────────┘
```

## 主要機能

- DuckDB v1.4.2によるメモリ内データ処理とIceberg拡張機能
- S3バケットポリシーによるクロスアカウントアクセス
- AWS Glue Catalogとの直接統合
- Dockerコンテナイメージによるデプロイ（CGO要件対応）
- Lambda ARM64（Graviton2）による高性能実行

## 前提条件

- Node.js 20.x以上
- Go 1.24以上
- AWS CLI設定済み
- Docker
- AWS CDK CLI

## セットアップ

`cdk/lib/parameter.ts`を編集してプロジェクト設定を行います。

```typescript
export const devParameter: AppParameter = {
  envName: "dev",
  projectName: "cm-kasama-duckdb-iceberg-lambda",
  env: {},
};
```

依存関係のインストール:

```bash
cd cdk && npm install
cd ../resources/lambda/duckdb-processor && go mod tidy
```

## デプロイ

### 1. ターゲットアカウント側

```bash
cd cdk
npx cdk deploy --all --require-approval never --profile <TARGET_AWS_PROFILE>
```

### 2. ソースアカウント側

```bash
cd ../cfn
aws cloudformation create-stack \
  --stack-name cm-kasama-duckdb-iceberg-source-bucket \
  --template-body file://s3-bucket.yaml \
  --parameters \
    ParameterKey=TargetAccountId,ParameterValue=<TARGET_ACCOUNT_ID> \
  --profile <SOURCE_ACCOUNT_PROFILE>
```

## 使い方

### 1. ソーステーブルとデータ投入（ソースアカウント）

Athenaで`sql/create_source_table.sql`を実行し、サンプルCSVをアップロード:

```bash
aws s3 cp resources/data/sample_data_2025-11-18.csv \
  s3://<SOURCE_BUCKET>/data/sales_data/id=ID001/date=2025-11-18/ \
  --profile <SOURCE_AWS_PROFILE>
```

### 2. Icebergテーブル作成（ターゲットアカウント）

Athenaで`sql/create_iceberg_table.sql`を実行。

### 3. Lambda関数実行

```bash
aws lambda invoke \
  --function-name cm-kasama-duckdb-iceberg-lambda-dev-processor \
  --payload '{"target_date":"2025-11-20"}' \
  --profile <AWS_PROFILE> \
  response.json
```

## クリーンアップ

```bash
# ターゲットアカウント
cd cdk && npx cdk destroy --profile <AWS_PROFILE>

# ソースアカウント
aws cloudformation delete-stack \
  --stack-name cm-kasama-duckdb-iceberg-source-bucket \
  --profile <SOURCE_ACCOUNT_PROFILE>
```
