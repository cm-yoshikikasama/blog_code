import * as path from 'node:path';
import { PythonLayerVersion } from '@aws-cdk/aws-lambda-python-alpha';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import type { Construct } from 'constructs';
import type { AppParameter } from './parameter';

interface DataPipelineStackProps extends cdk.StackProps {
  appParameter: AppParameter;
}

export class DataPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DataPipelineStackProps) {
    super(scope, id, props);

    const { envName, projectName, scheduleExpression } = props.appParameter;
    const prefix = `${projectName}-${envName}`;
    const targetDatabase = `${projectName.replace(/-/g, '_')}_${envName}`;

    // S3 Buckets
    const sourceBucket = new s3.Bucket(this, 'SourceBucket', {
      bucketName: `${prefix}-source-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const targetBucket = new s3.Bucket(this, 'TargetBucket', {
      bucketName: `${prefix}-target-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Glue Database & Iceberg Table
    const database = new glue.CfnDatabase(this, 'TargetDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: targetDatabase,
      },
    });

    const table = new glue.CfnTable(this, 'OrdersIcebergTable', {
      catalogId: this.account,
      databaseName: targetDatabase,
      openTableFormatInput: {
        icebergInput: {
          metadataOperation: 'CREATE',
          version: '2',
        },
      },
      tableInput: {
        name: 'orders_iceberg',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          format: 'parquet',
          write_compression: 'snappy',
        },
        storageDescriptor: {
          location: `s3://${targetBucket.bucketName}/iceberg/orders_iceberg/`,
          columns: [
            { name: 'order_id', type: 'string' },
            { name: 'customer_id', type: 'string' },
            { name: 'product_name', type: 'string' },
            { name: 'quantity', type: 'bigint' },
            { name: 'unit_price', type: 'double' },
            { name: 'order_date', type: 'date' },
            { name: 'processed_at', type: 'timestamp' },
          ],
        },
      },
    });
    table.addDependency(database);

    // Sample data deployment
    new s3deploy.BucketDeployment(this, 'SampleDataDeployment', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../resources/data'))],
      destinationBucket: sourceBucket,
      destinationKeyPrefix: 'data',
    });

    // DuckDB Lambda Layer
    const duckdbLayer = new PythonLayerVersion(this, 'DuckdbLayer', {
      entry: path.join(__dirname, '../layers'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      bundling: {
        assetHashType: cdk.AssetHashType.SOURCE,
        outputPathSuffix: 'python',
      },
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'ProcessAndLoadRole', {
      roleName: `${prefix}-process-and-load-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    sourceBucket.grantReadWrite(lambdaRole);
    targetBucket.grantReadWrite(lambdaRole);

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['glue:GetCatalog', 'glue:GetDatabase', 'glue:GetTable', 'glue:UpdateTable'],
        resources: [
          `arn:aws:glue:${this.region}:${this.account}:catalog`,
          `arn:aws:glue:${this.region}:${this.account}:database/${targetDatabase}`,
          `arn:aws:glue:${this.region}:${this.account}:table/${targetDatabase}/*`,
        ],
      })
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:GetCallerIdentity'],
        resources: ['*'],
      })
    );

    // Lambda function
    const processAndLoadLambda = new lambda.Function(this, 'ProcessAndLoad', {
      functionName: `${prefix}-process-and-load`,
      runtime: lambda.Runtime.PYTHON_3_13,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../resources/lambda')),
      handler: 'process_and_load.lambda_handler',
      role: lambdaRole,
      layers: [duckdbLayer],
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(5),
      memorySize: 3008,
      environment: {
        SOURCE_BUCKET: sourceBucket.bucketName,
        SOURCE_PREFIX: 'data',
        TARGET_DATABASE: targetDatabase,
        TARGET_TABLE: 'orders_iceberg',
      },
    });

    // Step Functions
    const processTask = new tasks.LambdaInvoke(this, 'ProcessAndLoadTask', {
      lambdaFunction: processAndLoadLambda,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const stateMachine = new sfn.StateMachine(this, 'DataPipelineStateMachine', {
      stateMachineName: `${prefix}-pipeline`,
      definitionBody: sfn.DefinitionBody.fromChainable(processTask),
      timeout: cdk.Duration.minutes(10),
    });

    // EventBridge Schedule
    new events.Rule(this, 'ScheduleRule', {
      ruleName: `${prefix}-schedule`,
      schedule: events.Schedule.expression(scheduleExpression),
      targets: [new targets.SfnStateMachine(stateMachine)],
    });
  }
}
