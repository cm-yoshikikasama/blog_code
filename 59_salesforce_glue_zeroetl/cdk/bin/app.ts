#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main-stack';
import { devParameter } from '../lib/parameter';

const app = new cdk.App();

new MainStack(app, `${devParameter.projectName}-stack`, {
  env: devParameter.env,
  description: 'Salesforce to S3 Zero ETL integration with AWS Glue',
  parameter: devParameter,
});
