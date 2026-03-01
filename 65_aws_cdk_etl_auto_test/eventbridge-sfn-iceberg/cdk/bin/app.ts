#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataPipelineStack } from '../lib/data-pipeline-stack';
import { devParameter } from '../lib/parameter';

const app = new cdk.App();

const { projectName, envName } = devParameter;

new DataPipelineStack(app, `${projectName}-${envName}`, {
  env: devParameter.env,
  appParameter: devParameter,
});
