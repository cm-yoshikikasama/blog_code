# AWSセキュリティチェックリスト

CDK実装後のセキュリティ自己チェックリスト

## 目次

- IAM最小権限
- S3セキュリティ
- Lambdaセキュリティ
- Glueセキュリティ
- シークレット管理
- その他のセキュリティベストプラクティス

## IAM最小権限

- [ ] Resource: "\*" を可能な限り使用していない
- [ ] リソースARNを具体的に指定（やむを得ない場合を除く）
- [ ] grant系メソッド（grantRead, grantReadWrite）を優先使用
- [ ] Lambda関数ごとに専用のIAMロールを作成
- [ ] AWS Managed Policyは必要最小限（例: AWSLambdaBasicExecutionRole）

```typescript
// Good - 具体的なARN
lambdaRole.addToPolicy(
  new iam.PolicyStatement({
    actions: ["glue:GetTable", "glue:UpdateTable"],
    resources: [
      `arn:aws:glue:${this.region}:${this.account}:database/${db}`,
      `arn:aws:glue:${this.region}:${this.account}:table/${db}/*`,
    ],
  }),
);

// Good - grant系メソッド
sourceBucket.grantRead(lambdaRole);
targetBucket.grantReadWrite(lambdaRole);

// Acceptable - やむを得ない場合のみ（STS等）
actions: ["sts:GetCallerIdentity"],
resources: ["*"]  // STSは特定リソースARNを持たない

// Bad - 過度に広い権限
resources: ["*"];
actions: ["s3:*"];
```

## S3セキュリティ

- [ ] 暗号化を有効化: encryption: s3.BucketEncryption.S3_MANAGED
- [ ] パブリックアクセスをブロック: blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
- [ ] バージョニング（本番環境推奨）: versioned: true
- [ ] アクセスログ（本番環境推奨）を設定

```typescript
const bucket = new s3.Bucket(this, "Bucket", {
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  versioned: true, // 本番環境
});
```

## Lambdaセキュリティ

- [ ] Lambda関数ごとに専用のIAMロールを使用
- [ ] 環境変数に機密情報を直接設定していない
- [ ] タイムアウト値を適切に設定（デフォルト3秒は短すぎる可能性）
- [ ] VPC接続（必要な場合）でネットワーク分離
- [ ] リクエストペイロードの検証を実装

```typescript
new lambda.Function(this, "Function", {
  role: dedicatedLambdaRole, // 専用ロール
  timeout: cdk.Duration.minutes(5), // 適切なタイムアウト
  environment: {
    BUCKET_NAME: bucketName, // 機密情報でない設定のみ
    // パスワード、APIキー等はSecretsManager参照
  },
});
```

## Glueセキュリティ

- [ ] Glue Catalogアクセスを特定データベース・テーブルに限定
- [ ] Glue Jobの実行ロールに最小権限を付与

## シークレット管理

- [ ] 環境変数に機密情報（パスワード、APIキー、トークン）を直接設定していない
- [ ] Secrets ManagerまたはParameter Storeを使用
- [ ] Lambda関数からSecretsManagerを参照（fromSecretAttributes）

```typescript
// Good - Secrets Manager参照
const secret = secretsmanager.Secret.fromSecretAttributes(this, "Secret", {
  secretCompleteArn: "arn:aws:secretsmanager:...",
});
secret.grantRead(lambdaRole);

// Bad - 平文で環境変数
environment: {
  API_KEY: "12345abcde", // 絶対NG
};
```

## その他のセキュリティベストプラクティス

- [ ] CloudTrailでAPI呼び出しをロギング（本番環境）
- [ ] CDK Bootstrapのqualifierをデフォルト（hnb659fds）から変更（S3バケット乗っ取り対策）
- [ ] タグ付け（環境、プロジェクト、コスト配分）
