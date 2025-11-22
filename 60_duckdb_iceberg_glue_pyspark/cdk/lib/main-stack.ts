import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
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
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // スクリプトと依存関係をS3にアップロード
    new s3deploy.BucketDeployment(this, 'DeployGlueScripts', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../resources/glue'))],
      destinationBucket: targetBucket,
      destinationKeyPrefix: 'scripts',
    });

    // ========================================
    // IAM Role: Glue Job用
    // ========================================
    const glueJobRole = new iam.Role(this, 'GlueJobRole', {
      roleName: `${parameter.projectName}-${parameter.envName}-glue-role`,
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
      ],
    });

    // Glue Catalog書き込み権限
    glueJobRole.addToPolicy(
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

    // S3読み取り権限（ソースバケット - ソースアカウント）
    glueJobRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
        resources: [`arn:aws:s3:::${sourceBucketName}`, `arn:aws:s3:::${sourceBucketName}/*`],
      })
    );

    // S3読み書き権限（ターゲットバケット - CDKで作成）
    targetBucket.grantReadWrite(glueJobRole);

    // CloudWatch Logs書き込み権限
    glueJobRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws-glue/python-jobs/*`,
        ],
      })
    );

    // ========================================
    // Glue PySpark Job
    // ========================================
    new glue.CfnJob(this, 'GlueJob', {
      name: `${parameter.projectName}-${parameter.envName}-job`,
      role: glueJobRole.roleArn,
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: `s3://${targetBucketName}/scripts/iceberg_copy.py`,
      },
      glueVersion: '5.0',
      workerType: 'G.1X',
      numberOfWorkers: 2,
      executionClass: 'STANDARD',
      defaultArguments: {
        '--enable-glue-datacatalog': 'true',
        '--additional-python-modules': 'duckdb==1.4.2',
        '--TempDir': `s3://${targetBucketName}/temp/`,
        '--job-language': 'python',
      },
      timeout: 30,
      tags: {
        Environment: parameter.envName,
        Project: parameter.projectName,
      },
    });

    // ========================================
    // IAM Role: Step Functions用
    // ========================================
    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
      roleName: `${parameter.projectName}-${parameter.envName}-sfn-role`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    // Glue Job名
    const glueJobName = `${parameter.projectName}-${parameter.envName}-job`;

    // Glue Job起動権限
    stepFunctionsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['glue:StartJobRun', 'glue:GetJobRun', 'glue:BatchStopJobRun'],
        resources: [`arn:aws:glue:${this.region}:${this.account}:job/${glueJobName}`],
      })
    );

    // ========================================
    // Step Functions: Glue Job直接実行
    // ========================================

    // Glue Job起動タスク
    const startGlueJob = new tasks.GlueStartJobRun(this, 'StartGlueJob', {
      glueJobName: glueJobName,
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      arguments: sfn.TaskInput.fromObject({
        '--JOB_NAME': glueJobName,
        '--SOURCE_BUCKET': sourceBucketName,
        '--SOURCE_PREFIX': 'data/sales_data',
        '--TARGET_DATABASE': targetDatabase,
        '--TARGET_TABLE': 'sales_data_iceberg',
        '--TARGET_DATE': sfn.JsonPath.stringAt('$.targetDate'),
      }),
      resultPath: '$.glueJobResult',
    });

    // Step Functions作成
    new sfn.StateMachine(this, 'StateMachine', {
      stateMachineName: `${parameter.projectName}-${parameter.envName}-workflow`,
      definitionBody: sfn.DefinitionBody.fromChainable(startGlueJob),
      role: stepFunctionsRole,
      timeout: cdk.Duration.hours(2),
    });
  }
}
