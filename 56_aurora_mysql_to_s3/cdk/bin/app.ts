#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuroraExportSfnStack } from '../lib/aurora-export-sfn-stack-asign';
import { type AppParameter, devParameter, prodParameter } from '../parameter';

const app = new cdk.App();

const envKey = app.node.tryGetContext('environment') ?? 'dev'; // default: dev

let parameter: AppParameter;

if (envKey === 'dev') {
  parameter = devParameter;
} else {
  parameter = prodParameter;
}

new AuroraExportSfnStack(app, `CmKasamaAuroraExportSfnStack${envKey.toUpperCase()}`, {
  env: {
    account: parameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: parameter.env?.region || process.env.CDK_DEFAULT_REGION,
  },
});
