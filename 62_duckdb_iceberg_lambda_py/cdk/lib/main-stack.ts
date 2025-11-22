import * as path from 'node:path';
import { PythonLayerVersion } from '@aws-cdk/aws-lambda-python-alpha';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
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
    const sourceBucketName = `${parameter.projectName}-${parameter.envName}-source`;
    const targetBucketName = `${parameter.projectName}-${parameter.envName}-target`;
    const targetDatabase = `${parameter.projectName.replace(/-/g, '_')}_${parameter.envName}`;

    // ========================================
    // S3 Bucket: ソースバケット作成
    // ========================================
    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      bucketName: sourceBucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // サンプルCSVファイルをアップロード
    new s3deploy.BucketDeployment(this, 'DeploySourceData', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../resources/data'))],
      destinationBucket: sourceBucket,
      destinationKeyPrefix: 'data/sales_data',
    });

    // ========================================
    // S3 Bucket: ターゲットバケット作成
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
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ========================================
    // IAM Role: Lambda関数用
    // ========================================
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      roleName: `${parameter.projectName}-${parameter.envName}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Glue Catalog書き込み権限
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'glue:GetDatabase',
          'glue:GetTable',
          'glue:CreateTable',
          'glue:UpdateTable',
          'glue:BatchCreatePartition',
          'glue:BatchUpdatePartition',
          'glue:GetPartition',
          'glue:GetPartitions',
        ],
        resources: [
          `arn:aws:glue:${this.region}:${this.account}:catalog`,
          `arn:aws:glue:${this.region}:${this.account}:database/${targetDatabase}`,
          `arn:aws:glue:${this.region}:${this.account}:table/${targetDatabase}/*`,
        ],
      })
    );

    // S3読み取り権限（ソースバケット）
    sourceBucket.grantRead(lambdaRole);

    // S3読み書き権限（ターゲットバケット）
    targetBucket.grantReadWrite(lambdaRole);

    // STS権限（アカウントID取得用）
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:GetCallerIdentity'],
        resources: ['*'],
      })
    );

    // ========================================
    // Lambda Layer: DuckDB
    // ========================================
    const duckdbLayer = new PythonLayerVersion(this, 'DuckdbLayer', {
      entry: path.join(__dirname, '../layers'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      bundling: {
        assetHashType: cdk.AssetHashType.SOURCE,
        outputPathSuffix: 'python',
      },
    });

    // ========================================
    // Lambda Function
    // ========================================
    new lambda.Function(this, 'IcebergCopyFunction', {
      functionName: `${parameter.projectName}-${parameter.envName}-function`,
      runtime: lambda.Runtime.PYTHON_3_13,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../resources/lambda')),
      handler: 'iceberg_copy.lambda_handler',
      role: lambdaRole,
      layers: [duckdbLayer],
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(5),
      memorySize: 3008,
      environment: {
        SOURCE_BUCKET: sourceBucketName,
        SOURCE_PREFIX: 'data/sales_data',
        TARGET_DATABASE: targetDatabase,
        TARGET_TABLE: 'sales_data_iceberg',
      },
    });
  }
}
