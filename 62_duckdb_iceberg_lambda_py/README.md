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
     └─ Iceberg テーブルに直接 insert
```

## 特徴

- Lambda Layer による DuckDB のシンプルなデプロイ
- DuckDB の Iceberg 拡張による Iceberg テーブルへの直接書き込み
- CDK による S3 バケットとサンプルデータの自動デプロイ
- 中間ストレージ不要のシンプルな構成
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
62_iceberg_duckdb_lambda/
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

注意: `cdk/lib/parameter.ts` の `projectName` を設定してください。
この値は S3 バケット名、IAM ロール名、データベース名などの
プレフィックスとして使用されます。

## デプロイ手順

### 1. CDK デプロイ

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

### 2. Glue Database と Iceberg テーブル作成

Athena で `sql/create_iceberg_tables.sql` を実行してください。

このファイルには以下が含まれています：

- Glue Database の作成
- Iceberg テーブルの作成

## 実行手順

### Lambda 関数の実行

#### 実行入力例

```json
{
  "SOURCE_BUCKET": "<PROJECT_NAME>-<ENV_NAME>-source",
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

```sql
SELECT * FROM cm_kasama_iceberg_duckdb_lambda_dev.sales_data_iceberg
WHERE date = DATE '2025-11-19'
LIMIT 10;

SELECT COUNT(*) FROM cm_kasama_iceberg_duckdb_lambda_dev.sales_data_iceberg
WHERE date = DATE '2025-11-19';
```

## クリーンアップ

```bash
# CDK スタック削除
cd cdk
npx cdk destroy --all --profile <AWS_PROFILE>
```
