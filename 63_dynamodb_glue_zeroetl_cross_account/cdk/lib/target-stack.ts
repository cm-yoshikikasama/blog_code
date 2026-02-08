import * as cdk from 'aws-cdk-lib';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import type { AppParameter } from './parameter';

interface TargetStackProps extends cdk.StackProps {
  parameter: AppParameter;
}

export class TargetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TargetStackProps) {
    super(scope, id, props);

    const { parameter } = props;

    const databaseName = `${parameter.projectName.replace(/-/g, '_')}_${parameter.envName}`;

    // ========================================
    // 1. S3 Bucket for Iceberg data
    // ========================================
    const dataLakeBucket = new s3.Bucket(this, 'DataLakeBucket', {
      bucketName: `${parameter.projectName}-${parameter.envName}-datalake`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ========================================
    // 2. Glue Database
    // ========================================
    const database = new glue.CfnDatabase(this, 'GlueDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: databaseName,
        description: 'DynamoDB Zero-ETL target database (Iceberg)',
        locationUri: dataLakeBucket.s3UrlForObject(),
      },
    });

    const databaseArn = `arn:aws:glue:${this.region}:${this.account}:database/${databaseName}`;

    // ========================================
    // 3. Target IAM Role
    // ========================================
    const targetRole = new iam.Role(this, 'ZeroETLTargetRole', {
      roleName: `${parameter.projectName}-${parameter.envName}-target-role`,
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
    });

    // S3 permissions
    dataLakeBucket.grantReadWrite(targetRole);

    // Glue Data Catalog permissions
    targetRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'glue:GetDatabase',
          'glue:GetDatabases',
          'glue:GetTable',
          'glue:GetTables',
          'glue:CreateTable',
          'glue:UpdateTable',
          'glue:DeleteTable',
          'glue:GetPartitions',
          'glue:BatchCreatePartition',
          'glue:BatchDeletePartition',
        ],
        resources: [
          `arn:aws:glue:${this.region}:${this.account}:catalog`,
          databaseArn,
          `arn:aws:glue:${this.region}:${this.account}:table/${databaseName}/*`,
        ],
      })
    );

    // CloudWatch Logs permissions
    targetRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws-glue/*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws-glue/*:*`,
        ],
      })
    );

    // ========================================
    // 4. Integration Resource Property (target only)
    // ========================================
    const targetResourceProperty = new glue.CfnIntegrationResourceProperty(
      this,
      'TargetResourceProperty',
      {
        resourceArn: databaseArn,
        targetProcessingProperties: {
          roleArn: targetRole.roleArn,
        },
      }
    );
    targetResourceProperty.node.addDependency(database);

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'TargetRoleArn', {
      value: targetRole.roleArn,
      description: 'Target Role ARN',
    });

    new cdk.CfnOutput(this, 'DataLakeBucketName', {
      value: dataLakeBucket.bucketName,
      description: 'S3 Data Lake Bucket Name',
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: databaseName,
      description: 'Glue Database Name',
    });
  }
}
