#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ETLStack } from '../lib/etl-stack';

const app = new cdk.App();
new ETLStack(app, 'CMKasamaETL', {
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
