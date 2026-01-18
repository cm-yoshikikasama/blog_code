---
name: checking-aws-security
description: Security checklist for AWS CDK implementations. Verify IAM minimum privileges, encryption settings, secret management, public access blocks. Use after implementing CDK stacks, before cdk synth, or during code reviews.
context: fork
---

# AWSセキュリティレビュー

AWS CDK実装のセキュリティを検証するためのガイドです。

## セキュリティレビューワークフロー

以下のチェックリストに従ってレビューを進める

```text
進捗:
- [ ] Step 1: IAM最小権限チェック
- [ ] Step 2: S3セキュリティチェック
- [ ] Step 3: Lambdaセキュリティチェック
- [ ] Step 4: シークレット管理チェック
- [ ] Step 5: 問題点の文書化
- [ ] Step 6: 修正確認
```

### Step 1: IAM最小権限チェック

IAMポリシーで以下を確認

- `Resource: "*"` の使用（STSなど必要な場合を除き避ける）
- 具体的なリソースARNの指定
- grantメソッドの活用（grantRead、grantReadWrite）
- Lambda関数ごとに専用IAMロール

詳細は [security-checklist.md](security-checklist.md) を参照。

### Step 2: S3セキュリティチェック

S3バケットで以下を確認

- encryption: s3.BucketEncryption.S3_MANAGED
- blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
- versioned: true（本番環境推奨）

### Step 3: Lambdaセキュリティチェック

Lambda関数で以下を確認

- 専用IAMロール
- 環境変数にシークレットを直接設定していない
- 適切なタイムアウト設定
- VPC設定（必要に応じて）

### Step 4: シークレット管理チェック

以下を確認

- 環境変数に平文のシークレットがない
- Secrets ManagerまたはParameter Storeを使用
- LambdaがシークレットへのgrantRead権限を持つ

### Step 5: 問題点の文書化

発見したセキュリティ問題を以下の形式で文書化

- 重要度（Critical/High/Medium/Low）
- 場所（ファイルパスと行番号）
- 具体的な修正手順

### Step 6: 修正確認

修正後に以下を実行

- セキュリティチェックを再実行
- CriticalとHighの問題がすべて解決されていることを確認
- `pnpm run cdk synth` で検証

## 詳細ガイド

[security-checklist.md](security-checklist.md) - セキュリティチェックリスト
