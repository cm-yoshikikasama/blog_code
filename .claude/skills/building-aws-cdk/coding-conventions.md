# AWS CDK コーディング規約

既存実装から抽出した詳細なコーディング規約。

## 目次

- インポート順序
- インターフェースとクラス定義
- リソース命名規則
- セクションコメント
- S3バケット設定（セキュリティ必須）
- S3デプロイメント
- IAMロール定義
- IAMポリシー追加（最小権限の原則）
- grant系メソッド使用
- Lambda Layer定義
- Lambda関数定義
- パラメータ管理（parameter.ts）
- アプリケーションエントリーポイント（app.ts）
- CDK テストパターン
  - 基本的なテスト構造

## インポート順序

```typescript
// 1. Node.js標準ライブラリ（node:プレフィックス）
import * as path from "node:path";

// 2. サードパーティライブラリ
import { PythonLayerVersion } from "@aws-cdk/aws-lambda-python-alpha";

// 3. aws-cdk-lib（メインパッケージ）
import * as cdk from "aws-cdk-lib";

// 4. aws-cdk-libサブモジュール（アルファベット順）
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

// 5. 型インポート（type修飾子使用）
import type { Construct } from "constructs";
import type { AppParameter } from "./parameter";
```

## インターフェースとクラス定義

```typescript
// Propsインターフェースはcdk.StackPropsを拡張
interface MainStackProps extends cdk.StackProps {
  parameter: AppParameter;
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    // 分割代入でパラメータ取得
    const { parameter } = props;
  }
}
```

## リソース命名規則

```typescript
// パターン: {projectName}-{envName}-{resourceType}
const sourceBucketName = `${parameter.projectName}-${parameter.envName}-source`;
const targetBucketName = `${parameter.projectName}-${parameter.envName}-target`;

// データベース名: ハイフンをアンダースコアに変換（ハイフン不可の場合）
const targetDatabase = `${parameter.projectName.replace(/-/g, "_")}_${parameter.envName}`;
```

## セクションコメント

リソースグループごとに視覚的に区切る:

```typescript
// ========================================
// S3 Bucket: ソースバケット作成
// ========================================
const sourceBucket = new s3.Bucket(this, "SourceBucket", {
  // ...
});

// ========================================
// IAM Role: Lambda関数用
// ========================================
const lambdaRole = new iam.Role(this, "LambdaRole", {
  // ...
});
```

## S3バケット設定（セキュリティ必須）

```typescript
const sourceBucket = new s3.Bucket(this, "SourceBucket", {
  bucketName: sourceBucketName,

  // 必須: S3管理暗号化
  encryption: s3.BucketEncryption.S3_MANAGED,

  // 必須: パブリックアクセス完全ブロック
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

  // 開発環境のみ: 削除ポリシー設定
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true, // removalPolicy: DESTROYと併用
});
```

〈重要〉本番環境では `removalPolicy: cdk.RemovalPolicy.RETAIN` を使用

## S3デプロイメント

```typescript
// サンプルデータをS3にアップロード
new s3deploy.BucketDeployment(this, "DeploySourceData", {
  sources: [
    s3deploy.Source.asset(path.join(__dirname, "../../resources/data")),
  ],
  destinationBucket: sourceBucket,
  destinationKeyPrefix: "data/sales_data",
});
```

〈パターン〉`path.join(__dirname, '...')` で相対パスを構築

## IAMロール定義

```typescript
const lambdaRole = new iam.Role(this, "LambdaRole", {
  roleName: `${parameter.projectName}-${parameter.envName}-lambda-role`,
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole",
    ),
  ],
});
```

## IAMポリシー追加（最小権限の原則）

```typescript
// Good: リソースARNを具体的に指定
lambdaRole.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      "glue:GetCatalog",
      "glue:GetDatabase",
      "glue:GetTable",
      "glue:UpdateTable",
    ],
    resources: [
      `arn:aws:glue:${this.region}:${this.account}:catalog`,
      `arn:aws:glue:${this.region}:${this.account}:database/${targetDatabase}`,
      `arn:aws:glue:${this.region}:${this.account}:table/${targetDatabase}/*`,
    ],
  }),
);

// Bad: 避けるべきパターン
// resources: ['*']  // STS等の例外を除いて使用しない
```

〈ベストプラクティス〉

- `${this.region}` と `${this.account}` でARNを動的構築
- ワイルドカードは最小限に（`table/${targetDatabase}/*` 等）
- `Resource: "*"` は原則禁止（STSの`GetCallerIdentity`等の例外あり）

## grant系メソッド使用

```typescript
// 推奨: grant系メソッドで最小権限を自動設定
sourceBucket.grantRead(lambdaRole); // S3読み取り権限
targetBucket.grantReadWrite(lambdaRole); // S3読み書き権限
```

〈利点〉CDKが自動的に最小限の権限を設定

## Lambda Layer定義

```typescript
const duckdbLayer = new PythonLayerVersion(this, "DuckdbLayer", {
  entry: path.join(__dirname, "../layers"),
  compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
  compatibleArchitectures: [lambda.Architecture.ARM_64],
  bundling: {
    assetHashType: cdk.AssetHashType.SOURCE,
    outputPathSuffix: "python",
  },
});
```

〈重要〉`compatibleRuntimes`と`compatibleArchitectures`は関数定義と一致させる

## Lambda関数定義

```typescript
new lambda.Function(this, "IcebergCopyFunction", {
  functionName: `${parameter.projectName}-${parameter.envName}-function`,

  // ランタイム設定
  runtime: lambda.Runtime.PYTHON_3_13,
  code: lambda.Code.fromAsset(path.join(__dirname, "../../resources/lambda")),
  handler: "iceberg_copy.lambda_handler", // ファイル名.関数名

  // IAMとレイヤー
  role: lambdaRole,
  layers: [duckdbLayer],

  // アーキテクチャ
  architecture: lambda.Architecture.ARM_64,

  // リソース設定
  timeout: cdk.Duration.minutes(5),
  memorySize: 3008, // MB単位

  // 環境変数（すべて大文字、アンダースコア区切り）
  environment: {
    SOURCE_BUCKET: sourceBucketName,
    SOURCE_PREFIX: "data/sales_data",
    TARGET_DATABASE: targetDatabase,
    TARGET_TABLE: "sales_data_iceberg",
  },
});
```

〈環境変数の命名規則〉

- すべて大文字
- 単語間はアンダースコア区切り
- 例: `SOURCE_BUCKET`, `TARGET_TABLE`

## パラメータ管理（parameter.ts）

```typescript
import type { Environment } from "aws-cdk-lib";

export interface AppParameter {
  env?: Environment;
  envName: string;
  projectName: string;
}

export const devParameter: AppParameter = {
  envName: "dev",
  projectName: "my-iceberg-duckdb-lambda",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
};
```

〈ベストプラクティス〉

- 型インポートには `import type` を使用
- アカウント情報は `process.env.CDK_DEFAULT_*` から取得
- ハードコード禁止

## アプリケーションエントリーポイント（app.ts）

```typescript
#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MainStack } from "../lib/main-stack";
import { devParameter } from "../lib/parameter";

const app = new cdk.App();

new MainStack(app, `${devParameter.projectName}-stack`, {
  env: devParameter.env,
  description: "Iceberg data copy using Lambda and DuckDB",
  parameter: devParameter,
});
```

〈パターン〉

- shebang行 `#!/usr/bin/env node`
- スタックID: `${parameter.projectName}-stack`
- descriptionプロパティで説明を追加

## CDK テストパターン

### 基本的なテスト構造

```typescript
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { MainStack } from "../lib/main-stack";
import type { AppParameter } from "../lib/parameter";

describe("MainStack", () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const parameter: AppParameter = {
      envName: "test",
      projectName: "test-project",
    };

    const stack = new MainStack(app, "TestStack", { parameter });
    template = Template.fromStack(stack);
  });

  // スナップショットテスト（CloudFormation全体の構造を保存）
  test("Snapshot", () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

  // リソース存在確認
  test("Resources exist", () => {
    template.resourceCountIs("AWS::Lambda::Function", 1);
    template.resourceCountIs("AWS::S3::Bucket", 1);
    template.resourceCountIs("AWS::IAM::Role", 1);
  });

  // 重要なプロパティのみ検証
  test("Lambda runtime", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "python3.12",
    });
  });

  test("S3 encryption enabled", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
    });
  });
});
```
