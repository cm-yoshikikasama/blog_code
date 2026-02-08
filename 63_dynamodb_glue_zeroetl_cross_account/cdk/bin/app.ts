#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SourceStack } from '../lib/source-stack';
import { TargetStack } from '../lib/target-stack';
import { IntegrationStack } from '../lib/integration-stack';
import { devParameter } from '../lib/parameter';

const app = new cdk.App();

const databaseName = `${devParameter.projectName.replace(/-/g, '_')}_${devParameter.envName}`;
const sourceTableArn = `arn:aws:dynamodb:${devParameter.sourceEnv.region}:${devParameter.sourceEnv.account}:table/${devParameter.tableName}`;
const targetDatabaseArn = `arn:aws:glue:${devParameter.targetEnv.region}:${devParameter.targetEnv.account}:database/${databaseName}`;

new SourceStack(
  app,
  `${devParameter.projectName}-source-stack`,
  {
    env: devParameter.sourceEnv,
    description:
      'DynamoDB Zero-ETL Source Account: DynamoDB table with PITR and resource policy',
    parameter: devParameter,
  }
);

new TargetStack(app, `${devParameter.projectName}-target-stack`, {
  env: devParameter.targetEnv,
  description:
    'DynamoDB Zero-ETL Target Account: S3, Glue Database, IAM Role',
  parameter: devParameter,
});

new IntegrationStack(
  app,
  `${devParameter.projectName}-integration-stack`,
  {
    env: devParameter.targetEnv,
    description: 'DynamoDB Zero-ETL Integration (deploy after scripts)',
    parameter: devParameter,
    sourceTableArn,
    targetDatabaseArn,
  }
);
