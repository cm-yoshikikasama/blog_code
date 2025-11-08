# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このリポジトリは、AWS クラウド技術のチュートリアルとサンプルコードを提供する日本語技術ブログのコードベースです。各番号付きディレクトリは、個別のブログ記事に対応する完結したプロジェクトを表しています。

### 主要技術スタック

- **AWS CDK**: TypeScript でインフラストラクチャをコード管理
- **AWS Lambda**: Python/Node.js によるサーバーレス処理
- **AWS Glue**: ETL パイプラインとデータ変換
- **CloudFormation**: インフラストラクチャテンプレート

## リポジトリ構造

各プロジェクトは以下の構造を持ちます：

```
<project_directory>/
├── cdk/                   # CDK プロジェクト
│   ├── lib/               # スタックとコンストラクト
│   ├── parameter.ts       # 環境設定（重要）
│   └── bin/app.ts         # エントリーポイント
├── resources/lambda/      # Lambda 関数コード
└── README.md              # プロジェクト説明
```

## よく使うコマンド

### AWS CDK

```bash
cd cdk
npm install
npx cdk synth --profile <AWS_PROFILE>
npx cdk deploy --all --require-approval never --profile <AWS_PROFILE>
npx cdk destroy --profile <AWS_PROFILE>
```

### CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name <STACK_NAME> \
  --template-body file://template.yaml \
  --capabilities CAPABILITY_IAM \
  --profile <AWS_PROFILE>

aws cloudformation delete-stack \
  --stack-name <STACK_NAME> \
  --profile <AWS_PROFILE>
```

## Linter & Formatter

`.claude/hooks/format-all.sh` により、ファイル編集時に自動フォーマット & lint が実行されます：

- **Python**: Ruff (format + check)
- **TypeScript/JS**: Biome
- **SQL**: SQLFluff
- **Shell**: shfmt + shellcheck
- **YAML**: Prettier + yamllint
- **Markdown**: Prettier + markdownlint

手動実行：

```bash
# TypeScript/JavaScript
npx @biomejs/biome check --write .

# Python
ruff format . && ruff check --fix .
```

## コーディング規約

- **言語**: コメント・ドキュメントは日本語、コード・変数名は英語
- **命名規則**:
  - Python: スネークケース (`user_id`, `calculate_total`)
  - TypeScript: キャメルケース (`userId`, `calculateTotal`)
  - CDK リソース: パスカルケース (`MyLambdaFunction`)
- **品質管理**: lint エラーは必ず修正すること

## 重要な設定ファイル

### parameter.ts

CDK プロジェクトの環境設定を一元管理：

```typescript
export const devParameter: AppParameter = {
  envName: "dev",
  projectName: "my-project",
  env: {},
};
```

## Git 運用

### コミットメッセージ

```bash
# 形式: <type>: <subject>
feat: Lambda 関数に S3 イベントトリガーを追加
fix: CDK デプロイ時のタイムアウトエラーを修正
docs: README にデプロイ手順を追加
```

## 注意事項

### セキュリティ

- **認証情報**: 環境変数または AWS Secrets Manager から取得（ハードコード禁止）
- **IAM ポリシー**: 最小権限の原則に従う
- **S3 バケット**: 適切な暗号化とアクセス制御を設定

### デプロイ前のチェックリスト

- [ ] AWS プロファイル設定を確認
- [ ] `parameter.ts` の設定値を確認
- [ ] CDK diff で変更内容を確認
- [ ] 機密情報がハードコードされていない
