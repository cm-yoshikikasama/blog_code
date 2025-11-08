#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CrossAccountGlueAthenaStack } from '../lib/cross-account-glue-athena-stack';
import { devParameter } from '../parameter';

const app = new cdk.App();

// Get sourceAccountId from context (runtime argument)
const sourceAccountId = app.node.tryGetContext('sourceAccountId');

// Validate sourceAccountId
if (!sourceAccountId) {
  throw new Error(
    `sourceAccountId is required. Please provide it via context:
  npx cdk deploy --context sourceAccountId=111111111111`
  );
}

// Stack name using project name
const stackName = `${devParameter.projectName}-stack`;

new CrossAccountGlueAthenaStack(app, stackName, {
  stackName: stackName,
  description:
    'Target Account - Cross-account Glue Data Catalog access with Athena and Step Functions (tag:cross-account-glue)',
  env: {
    account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Project: devParameter.projectName,
    Environment: devParameter.envName,
    Repository: 'blog-code-58',
  },
  projectName: devParameter.projectName,
  envName: devParameter.envName,
  parameter: devParameter,
  sourceAccountId,
});
