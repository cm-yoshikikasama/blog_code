import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { AppParameter } from './parameter';

interface SourceStackProps extends cdk.StackProps {
  parameter: AppParameter;
}

export class SourceStack extends cdk.Stack {
  public readonly table: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: SourceStackProps) {
    super(scope, id, props);

    const { parameter } = props;

    // ========================================
    // DynamoDB TableV2 with PITR
    // ========================================
    this.table = new dynamodb.TableV2(this, 'ZeroETLSourceTable', {
      tableName: parameter.tableName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ========================================
    // Resource Policy: Allow Glue service (from Target Account) to export
    // ========================================
    this.table.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowGlueZeroETLExport',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('glue.amazonaws.com')],
        actions: [
          'dynamodb:ExportTableToPointInTime',
          'dynamodb:DescribeTable',
          'dynamodb:DescribeExport',
        ],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': parameter.targetEnv.account,
          },
          ArnLike: {
            'aws:SourceArn': `arn:aws:glue:${parameter.targetEnv.region}:${parameter.targetEnv.account}:integration:*`,
          },
        },
      })
    );

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB Table ARN (use in Target Stack)',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}
