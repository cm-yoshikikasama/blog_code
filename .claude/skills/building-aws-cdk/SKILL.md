---
name: building-aws-cdk
description: Provides AWS CDK implementation patterns with TypeScript using L2 Constructs for Lambda, IAM, S3, DynamoDB. Applies type-safe patterns, resource naming conventions, security best practices. Use when creating CDK stacks, defining AWS resources, or implementing infrastructure as code with TypeScript.
---

# AWS CDK実装

TypeScriptでAWS CDKスタックを実装するためのガイドです。

## 基本的なStack定義

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

interface MyStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);

    const { envName, projectName } = props;

    // リソース定義
    new s3.Bucket(this, "Bucket", {
      bucketName: `${projectName}-${envName}-bucket`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
  }
}
```

## 実装ワークフロー

以下のチェックリストに従って実装を進める

```text
進捗:
- [ ] Step 1: 型付きpropsでStackインターフェースを定義
- [ ] Step 2: 命名規則に従ってリソースを作成
- [ ] Step 3: セキュリティベストプラクティスを適用（暗号化、IAM）
- [ ] Step 4: pnpm run build で検証
- [ ] Step 5: pnpm run cdk synth で確認
- [ ] Step 6: コーディング規約と照合
```

### Step 1: 型付きpropsでStackインターフェースを定義

Stack propsはcdk.StackPropsを継承する

```typescript
interface MyStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}
```

TypeScriptで `any` 型は使用禁止。

### Step 2: 命名規則に従ってリソースを作成

一貫した命名パターンを使用: `${projectName}-${envName}-${resourceType}`

```typescript
const bucketName = `${projectName}-${envName}-bucket`;
```

### Step 3: セキュリティベストプラクティスを適用

必須のセキュリティ設定

- S3: 暗号化 + パブリックアクセスブロック
- IAM: 具体的なリソースARN（`Resource: "*"` は避ける）
- Lambda: 関数ごとに専用IAMロール

詳細は [coding-conventions.md](coding-conventions.md) を参照。

### Step 4: pnpm run build で検証

TypeScriptビルドで型エラーをチェック

```bash
cd cdk
pnpm run build
```

すべての型エラーを修正してから次へ進む。

### Step 5: pnpm run cdk synth で確認

CloudFormationテンプレートを生成

```bash
pnpm run cdk synth
```

生成されたテンプレートの正確性を確認。

### Step 6: コーディング規約と照合

[coding-conventions.md](coding-conventions.md) と照合してコンプライアンスを確認。

## Glue Database/Table定義

Glue DatabaseとTableはCDK constructsではなく、SQLファイルで定義する。

### ファイル構成

```text
(project)/
├── sql/
│   └── create_tables.sql    # Glue Database/Table定義
└── cdk/
    └── lib/
```

### SQLファイル例

```sql
-- Database作成
CREATE DATABASE IF NOT EXISTS sample_db
COMMENT 'Sample database';

-- Icebergテーブル作成
CREATE TABLE sample_db.sample_table (
    id STRING,
    created_at TIMESTAMP
)
LOCATION 's3://bucket-name/iceberg/sample_table/'
TBLPROPERTIES (
    'table_type' = 'ICEBERG',
    'format' = 'parquet'
);
```

### 命名規則

- Database名: `<project_name>_<env_name>`（ハイフンはアンダースコアに置換）
- Table LOCATION: `s3://<project-name>-<env-name>-bucket/path/`

### CDK連携

CDKはインフラのみを定義し、Glue Database/Tableは定義しない

- S3バケット（テーブルデータ保存先）
- IAMロール（Athena/Glueアクセス用）
- Athena WorkGroup（必要に応じて）

SQLファイルはAthenaコンソール、CLI、またはLambdaで実行する。

## 参考

[coding-conventions.md](coding-conventions.md) - コーディング規約
