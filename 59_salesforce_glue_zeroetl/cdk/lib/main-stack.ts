import * as cdk from 'aws-cdk-lib';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as iam from 'aws-cdk-lib/aws-iam';
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

    // Resource naming conventions
    const dataLakeBucketName = `${parameter.projectName}-${parameter.envName}-datalake`;
    const databaseName = `${parameter.projectName.replace(/-/g, '_')}_${parameter.envName}`;
    const integrationName = `${parameter.projectName}-${parameter.envName}-integration`;
    const connectionName = `${parameter.projectName}-${parameter.envName}-salesforce-connection`;

    // Reference S3 bucket created by Prerequisites stack
    const dataLakeBucket = s3.Bucket.fromBucketName(this, 'DataLakeBucket', dataLakeBucketName);

    // External resource ARNs (created via CloudFormation / AWS Console)
    const databaseArn = `arn:aws:glue:${this.region}:${this.account}:database/${databaseName}`;
    const connectionArn = `arn:aws:glue:${this.region}:${this.account}:connection/${connectionName}`;
    const sourceRoleArn = `arn:aws:iam::${this.account}:role/${parameter.projectName}-${parameter.envName}-source-role`;

    // ========================================
    // 1. Target IAM Role (for S3/Glue Catalog)
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
          `arn:aws:glue:${this.region}:${this.account}:database/${databaseName}`,
          `arn:aws:glue:${this.region}:${this.account}:table/${databaseName}/*`,
        ],
      })
    );

    // CloudWatch Logs permissions
    targetRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws-glue/*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws-glue/*:*`,
        ],
      })
    );

    // ========================================
    // 2. Integration Resource Properties (source and target)
    // ========================================
    // Source: Salesforce Connection with Source Role
    const sourceResourceProperty = new glue.CfnIntegrationResourceProperty(
      this,
      'SourceResourceProperty',
      {
        resourceArn: connectionArn,
        sourceProcessingProperties: {
          roleArn: sourceRoleArn,
        },
      }
    );

    // Target: Glue Database with Target Role
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

    // ========================================
    // 3. Zero ETL Integration
    // ========================================
    // Note: Salesforce Connection must be created via AWS Console before CDK deploy
    const zeroEtlIntegration = new glue.CfnIntegration(this, 'ZeroETLIntegration', {
      integrationName: integrationName,
      sourceArn: connectionArn,
      targetArn: databaseArn,
      description: 'Salesforce to S3 (Iceberg) Zero-ETL Integration',
      dataFilter: parameter.dataFilter,

      integrationConfig: {
        continuousSync: true,
        refreshInterval: `${parameter.syncFrequencyMinutes}`,
      },
      tags: [
        { key: 'Environment', value: parameter.envName },
        { key: 'DataFormat', value: 'Iceberg' },
      ],
    });

    zeroEtlIntegration.node.addDependency(sourceResourceProperty);
    zeroEtlIntegration.node.addDependency(targetResourceProperty);

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'IntegrationArn', {
      value: zeroEtlIntegration.attrIntegrationArn,
      description: 'Zero-ETL Integration ARN',
    });

    new cdk.CfnOutput(this, 'TargetRoleArn', {
      value: targetRole.roleArn,
      description: 'Target Role ARN',
    });
  }
}
