import * as cdk from 'aws-cdk-lib';
import * as glue from 'aws-cdk-lib/aws-glue';
import type { Construct } from 'constructs';
import type { AppParameter } from './parameter';

interface IntegrationStackProps extends cdk.StackProps {
  parameter: AppParameter;
  sourceTableArn: string;
  targetDatabaseArn: string;
}

export class IntegrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IntegrationStackProps) {
    super(scope, id, props);

    const { parameter, sourceTableArn, targetDatabaseArn } = props;

    // ========================================
    // Zero-ETL Integration
    // ========================================
    const zeroEtlIntegration = new glue.CfnIntegration(this, 'ZeroETLIntegration', {
      integrationName: `${parameter.projectName}-${parameter.envName}-integration`,
      sourceArn: sourceTableArn,
      targetArn: targetDatabaseArn,
      description: 'DynamoDB to SageMaker Lakehouse Zero-ETL Integration (Cross-Account)',
      integrationConfig: {
        refreshInterval: `${parameter.refreshIntervalMinutes}`,
      },
      tags: [
        { key: 'Environment', value: parameter.envName },
        { key: 'Project', value: parameter.projectName },
      ],
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'IntegrationArn', {
      value: zeroEtlIntegration.attrIntegrationArn,
      description: 'Zero-ETL Integration ARN',
    });
  }
}
