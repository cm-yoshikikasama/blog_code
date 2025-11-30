# Lambda + DuckDB による Iceberg データコピー

## 概要

このプロジェクトは、AWS Lambda と DuckDB 1.4.2 の Iceberg 拡張を使用して、S3 の CSV データを Iceberg テーブルに効率的にコピーするソリューションです。

重要: デプロイ前に `cdk/lib/parameter.ts` の `projectName` を変更してください。この値は S3 バケット名、IAM ロール名、データベース名などのプレフィックスとして使用されます。

## アーキテクチャ

```txt
Lambda Function（手動実行）
  └─ DuckDB 1.4.2 + Iceberg 拡張（Lambda Layer）
     ├─ S3 から CSV 読み取り
     ├─ AWS Glue カタログに接続
     ├─ 既存データを delete（重複防止）
     └─ Iceberg テーブルに insert
```

## 特徴

- Lambda Layer による DuckDB のシンプルなデプロイ
- DuckDB の Iceberg 拡張による Iceberg テーブルへの直接書き込み
- CDK による S3 バケットとサンプルデータの自動デプロイ
- DuckDB だけで完結する高速な ETL 処理
- サーバーレスで低コスト

## 実装方法

このプロジェクトでは DuckDB 1.4.2 の Iceberg 拡張を使用します。

ファイル: `resources/lambda/iceberg_copy.py`

特徴:

- DuckDB で S3 から CSV ファイルを読み取り
- DuckDB の Iceberg 拡張で AWS Glue カタログに接続
- DuckDB だけで Iceberg テーブルに直接 insert
- Lambda Layer で DuckDB を提供

## ディレクトリ構造

```txt
62_duckdb_iceberg_lambda_py/
├── cdk/
│   ├── bin/
│   │   └── app.ts              # CDK エントリーポイント
│   ├── lib/
│   │   ├── parameter.ts        # 環境設定
│   │   └── main-stack.ts       # メインスタック（S3, IAM, Lambda Layer, Lambda）
│   ├── layers/
│   │   └── requirements.txt    # Lambda Layer 用 DuckDB 依存関係
│   ├── package.json
│   ├── tsconfig.json
│   └── cdk.json
├── resources/
│   ├── data/
│   │   ├── sample_data_2025-11-18.csv  # 2025-11-18 サンプルデータ
│   │   ├── sample_data_2025-11-19.csv  # 2025-11-19 サンプルデータ
│   │   └── sample_data_2025-11-20.csv  # 2025-11-20 サンプルデータ
│   └── lambda/
│       └── iceberg_copy.py     # Lambda 関数（DuckDB 1.4.2 Iceberg 拡張版）
├── sql/
│   └── create_iceberg_tables.sql # Database + Iceberg テーブル作成 DDL
└── README.md
```

## 前提条件

1. AWS CLI と AWS アカウントの設定
2. Node.js と npm のインストール
3. AWS CDK のインストール（グローバルまたはローカル）

## デプロイ手順

### 1. プロジェクト設定

デプロイ前に `cdk/lib/parameter.ts` を編集して、`projectName` を変更してください。

```typescript
export const devParameter: AppParameter = {
  envName: "dev",
  projectName: "my-iceberg-duckdb-lambda", // ← ここを変更
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
};
```

この値は以下のリソース名のプレフィックスとして使用されます：

- S3 バケット名: `<PROJECT_NAME>-<ENV_NAME>-source`, `<PROJECT_NAME>-<ENV_NAME>-target`
- Lambda 関数名: `<PROJECT_NAME>-<ENV_NAME>-function`
- IAM ロール名: `<PROJECT_NAME>-<ENV_NAME>-lambda-role`
- Glue Database 名: `<PROJECT_NAME の - を _ に置換>_<ENV_NAME>`

### 2. CDK デプロイ

```bash
cd cdk

# 依存関係インストール
npm install

# デプロイ
npx cdk deploy --all --require-approval never --profile <AWS_PROFILE>
```

このステップで以下のリソースが自動的にデプロイされます：

- ソース S3 バケット（`<PROJECT_NAME>-<ENV_NAME>-source`）
- サンプル CSV データ（`resources/data/` から自動アップロード）
- ターゲット S3 バケット（`<PROJECT_NAME>-<ENV_NAME>-target`）
- DuckDB Lambda Layer
- Lambda 関数
- IAM ロール

注意: CDK デプロイによってサンプル CSV データは自動的に S3 にアップロードされます。手動でアップロードする場合は、以下の手順を実行してください。

#### AWS CLI でサンプルデータを手動アップロード

```bash
# プロジェクトルートから実行
aws s3 sync resources/data/ s3://<PROJECT_NAME>-<ENV_NAME>-source/data/sales_data/ --profile <AWS_PROFILE>

# アップロード確認
aws s3 ls s3://<PROJECT_NAME>-<ENV_NAME>-source/data/sales_data/ --profile <AWS_PROFILE>
```

### 3. Glue Database と Iceberg テーブル作成

`sql/create_iceberg_tables.sql` を編集して、プレースホルダーを実際の値に置き換えてください。

```sql
-- 修正例
CREATE DATABASE IF NOT EXISTS my_iceberg_duckdb_lambda_dev

CREATE TABLE my_iceberg_duckdb_lambda_dev.sales_data_iceberg (
  ...
)
LOCATION 's3://my-iceberg-duckdb-lambda-dev-target/iceberg/sales_data_iceberg/'
```

修正後、Athena でこのファイルの内容を実行してください。

このファイルには以下が含まれています：

- Glue Database の作成
- Iceberg テーブルの作成

## 実行手順

### Lambda 関数の実行

#### 実行入力例

```json
{
  "TARGET_DATE": "2025-11-19"
}
```

#### AWS コンソールでの実行

1. Lambda コンソールを開く
2. `<PROJECT_NAME>-<ENV_NAME>-function` を選択
3. テストタブをクリック
4. 上記の実行入力 JSON を貼り付け
5. テスト実行

### 実行結果の確認

#### Athena でデータ確認

注意: `<DATABASE_NAME>` を実際のデータベース名（例: `my_iceberg_duckdb_lambda_dev`）に置き換えてください。

```sql
SELECT * FROM <DATABASE_NAME>.sales_data_iceberg
WHERE date = DATE '2025-11-19'
LIMIT 10;

SELECT COUNT(*) FROM <DATABASE_NAME>.sales_data_iceberg
WHERE date = DATE '2025-11-19';
```

## クリーンアップ

```bash
# CDK スタック削除
cd cdk
npx cdk destroy --all --profile <AWS_PROFILE>
```
