#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main-stack';
import { devParameter } from '../lib/parameter';

const app = new cdk.App();

new MainStack(app, `${devParameter.projectName}-stack`, {
  env: devParameter.env,
  description: 'Lambda(Go) with DuckDB + Iceberg for cross-account data processing',
  parameter: devParameter,
});

app.synth();
