# クロスアカウント Iceberg データコピー

## 概要

重要: デプロイ前に `cdk/lib/parameter.ts` の `projectName` を変更してください。この値は S3 バケット名、IAM ロール名、データベース名などのプレフィックスとして使用されます。

## アーキテクチャ

```txt
Step Functions（手動実行）
  └─ Glue PySpark Job
     └─ DuckDB 1.4.2 + Iceberg 拡張
        ├─ S3 から CSV 読み取り
        │  └─ s3://bucket/sales_data/sample_data_YYYY-MM-DD.csv
        ├─ AWS Glue カタログに接続
        └─ Iceberg テーブルに直接 insert
```

## 特徴

- DuckDB の glob パターンによる柔軟な S3 ファイル読み取り
- DuckDB の Iceberg 拡張による Iceberg テーブルへの直接書き込み
- Step Functions による自動実行とエラーハンドリング
- 中間ストレージ不要のシンプルな構成
- AWS Glue 5.0 での DuckDB 1.4.2 サポート（GLIBC 2.34 互換）
- DuckDB だけで完結する高速な ETL 処理

## 実装方法

このプロジェクトでは DuckDB 1.4.2 の Iceberg 拡張を使用します。

ファイル: `resources/glue/iceberg_copy.py`

## ディレクトリ構造

```txt
60_cross_account_iceberg/
├── cfn/
│   └── s3-bucket.yaml          # ソース S3 bucket 作成
├── cdk/
│   ├── bin/
│   │   └── app.ts              # CDK エントリーポイント
│   ├── lib/
│   │   ├── parameter.ts        # 環境設定
│   │   └── main-stack.ts       # メインスタック（IAM, Glue, Step Functions）
│   ├── package.json
│   ├── tsconfig.json
│   └── cdk.json
├── resources/
│   ├── data/
│   │   ├── sample_data_2025-11-18.csv  # 2025-11-18 サンプルデータ
│   │   ├── sample_data_2025-11-19.csv  # 2025-11-19 サンプルデータ
│   │   └── sample_data_2025-11-20.csv  # 2025-11-20 サンプルデータ
│   └── glue/
│       ├── iceberg_copy.py     # Glue PySpark スクリプト（DuckDB 1.4.2 Iceberg 拡張版）
│       └── requirements.txt    # Python 依存関係
├── sql/
│   ├── create_source_table.sql  # ソーステーブル作成 DDL（ソースアカウント側）
│   └── create_iceberg_tables.sql # Database + Iceberg テーブル作成 DDL（ターゲットアカウント側）
└── README.md
```

## 前提条件

1. AWS CLI と AWS アカウントの設定
2. Node.js と npm のインストール
3. AWS CDK のインストール（グローバルまたはローカル）
4. ソースアカウントの S3 バケットへのアクセス権限
5. ターゲットアカウントの Glue Catalog へのアクセス権限

## デプロイ手順

### 1. CDK デプロイ（ターゲットアカウント）

```bash
cd cdk

# 依存関係インストール
npm install

# デプロイ
npx cdk deploy --all --require-approval never --profile <TARGET_AWS_PROFILE>
```

### 2. CloudFormation でソース S3 バケット作成（ソースアカウント）

```bash
cd ../cfn

aws cloudformation create-stack \
  --stack-name cm-kasama-iceberg-dev-s3 \
  --template-body file://s3-bucket.yaml \
  --parameters \
    ParameterKey=TargetAccountId,ParameterValue=<TARGET_ACCOUNT_ID> \
  --profile <SOURCE_AWS_PROFILE>

```

### 3. Glue Database と Iceberg テーブル作成（ターゲットアカウント）

Athena で `sql/create_iceberg_tables.sql` を実行してください。

このファイルには以下が含まれています：

- Glue Database の作成
- Iceberg テーブルの作成

### 4. ソーステーブル作成とサンプルデータ投入（ソースアカウント）

#### 4-1. Athena でテーブル作成

Athena で `sql/create_source_table.sql` の前半（テーブル作成部分）を実行してください。

#### 4-2. サンプル CSV ファイルのアップロード

`resources/data/` 配下のサンプルファイルを S3 の対応するパーティションにアップロードします。

```bash
# 2025-11-18 のデータ
aws s3 cp resources/data/sample_data_2025-11-18.csv \
  s3://<SOURCE_BUCKET_NAME>/data/sales_data/sample_data_2025-11-18.csv \
  --profile <SOURCE_AWS_PROFILE>

# 2025-11-19 のデータ
aws s3 cp resources/data/sample_data_2025-11-19.csv \
  s3://<SOURCE_BUCKET_NAME>/data/sales_data/sample_data_2025-11-19.csv \
  --profile <SOURCE_AWS_PROFILE>

# 2025-11-20 のデータ
aws s3 cp resources/data/sample_data_2025-11-20.csv \
  s3://<SOURCE_BUCKET_NAME>/data/sales_data/sample_data_2025-11-20.csv \
  --profile <SOURCE_AWS_PROFILE>
```

## 実行手順

### Step Functions の手動実行

CDK デプロイ完了後、Output に表示される `StateMachineArn` を使用して Step Functions を実行します。

#### 実行入力例

```json
{
  "targetDate": "2025-11-19"
}
```

#### AWS コンソールでの実行

1. Step Functions コンソールを開く
2. 実行開始ボタンをクリック
3. 上記の実行入力 JSON を貼り付け
4. 実行開始

### 実行結果の確認

#### Athena でデータ確認

```sql
SELECT * FROM cm_kasama_iceberg_dev.sales_data_iceberg
WHERE date = DATE '2025-11-19'
LIMIT 10;

SELECT COUNT(*) FROM cm_kasama_iceberg_dev.sales_data_iceberg
WHERE date = DATE '2025-11-19';
```

## クリーンアップ

```bash
# CDK スタック削除（ターゲットアカウント）
cd cdk
npx cdk destroy --all --profile <TARGET_AWS_PROFILE>

# CloudFormation スタック削除（ソースアカウント）
cd ../cfn
aws cloudformation delete-stack \
  --stack-name cm-kasama-iceberg-dev-s3 \
  --profile <SOURCE_AWS_PROFILE>

# S3 バケット内のオブジェクト削除（必要に応じて）
# ソースバケット
aws s3 rm s3://<SOURCE_BUCKET_NAME> \
  --recursive \
  --profile <SOURCE_AWS_PROFILE>

# ターゲットバケット
aws s3 rm s3://<TARGET_BUCKET_NAME> \
  --recursive \
  --profile <TARGET_AWS_PROFILE>
```
