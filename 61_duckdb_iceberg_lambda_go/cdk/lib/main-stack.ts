import * as path from 'node:path';
// cSpell:words duckdb pyiceberg
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import type { AppParameter } from './parameter';

interface MainStackProps extends cdk.StackProps {
  parameter: AppParameter;
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    const { parameter } = props;

    // リソース名の構築
    const targetBucketName = `${parameter.projectName}-${parameter.envName}-target`;
    const glueDatabase = `${parameter.projectName.replace(/-/g, '_')}_${parameter.envName}`;
    const glueTable = 'processed_data_iceberg';

    // ========================================
    // S3 Bucket: ターゲットバケット作成（Icebergデータ保存用）
    // ========================================
    const targetBucket = new s3.Bucket(this, 'TargetBucket', {
      bucketName: targetBucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================
    // IAM Role: Lambda実行ロール
    // ========================================
    const lambdaRole = new iam.Role(this, 'DuckDBLambdaRole', {
      roleName: `${parameter.projectName}-${parameter.envName}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Glue Catalog権限（読み取りと書き込み）
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'glue:GetDatabase',
          'glue:GetDatabases',
          'glue:GetTable',
          'glue:GetTables',
          'glue:GetPartition',
          'glue:GetPartitions',
          'glue:CreateTable',
          'glue:UpdateTable',
          'glue:BatchCreatePartition',
          'glue:BatchUpdatePartition',
        ],
        resources: [
          `arn:aws:glue:${this.region}:${this.account}:catalog`,
          `arn:aws:glue:${this.region}:${this.account}:database/${glueDatabase}`,
          `arn:aws:glue:${this.region}:${this.account}:table/${glueDatabase}/*`,
        ],
      })
    );

    // クロスアカウントS3アクセス権限（読み取り専用）
    // S3バケットポリシーでLambda roleに直接アクセス許可されている前提
    // （ソースアカウント側のcfn/s3-bucket.yamlでバケットポリシー設定）
    if (parameter.sourceBucketName) {
      lambdaRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
          resources: [
            `arn:aws:s3:::${parameter.sourceBucketName}`,
            `arn:aws:s3:::${parameter.sourceBucketName}/*`,
          ],
        })
      );
    }

    // S3読み書き権限（ターゲットバケット - Icebergデータ保存用）
    targetBucket.grantReadWrite(lambdaRole);

    // ========================================
    // Lambda Function: DuckDB + Iceberg Processor
    // ========================================
    new lambda.DockerImageFunction(this, 'DuckDBProcessor', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../resources/lambda/duckdb-processor'),
        {
          file: 'Dockerfile',
          exclude: ['cdk.out', 'node_modules', '.git'],
        }
      ),
      functionName: `${parameter.projectName}-${parameter.envName}-processor`,
      description: 'DuckDBでS3 CSVからIcebergテーブルへデータ処理',
      role: lambdaRole,

      // リソース設定
      memorySize: 4096, // 4GB
      timeout: cdk.Duration.minutes(15),
      ephemeralStorageSize: cdk.Size.gibibytes(10),
      architecture: lambda.Architecture.ARM_64,

      // 環境変数
      environment: {
        HOME: '/tmp', // DuckDB拡張機能インストールに必須
        AWS_ACCOUNT_ID: this.account,
        GLUE_DATABASE: glueDatabase,
        GLUE_TABLE: glueTable,
        LOG_LEVEL: 'INFO',
        // ソースデータ設定
        SOURCE_BUCKET:
          parameter.sourceBucketName || `${parameter.projectName}-${parameter.envName}-source`,
        SOURCE_PREFIX: 'data/sales_data',
        // ターゲットデータ設定
        TARGET_BUCKET: targetBucketName,
      },
    });
  }
}
