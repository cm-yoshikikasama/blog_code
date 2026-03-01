#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GlueStack } from '../lib/glue';

const app = new cdk.App();
new GlueStack(app, 'CMKasamaETL', {
  description: 'ETL (tag:kasama-test-tag)',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Repository: 'kasama-test-tag',
  },

  projectName: 'cm-kasama-dev',
  envName: 'dev',
});
