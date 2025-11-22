#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main-stack';
import { devParameter } from '../lib/parameter';

const app = new cdk.App();

new MainStack(app, `${devParameter.projectName}-stack`, {
  env: devParameter.env,
  description: 'Cross-account Iceberg data copy using Glue Python Shell and Step Functions',
  parameter: devParameter,
});
