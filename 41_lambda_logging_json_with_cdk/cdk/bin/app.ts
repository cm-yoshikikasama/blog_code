#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LambdaStack } from "../lib/lambda-logging-json-stack";
import { devParameter, prodParameter } from "../parameter";

const app = new cdk.App();

const envKey = app.node.tryGetContext("environment") ?? "dev"; // default: dev

let parameter;

if (envKey === "dev") {
  parameter = devParameter;
} else {
  parameter = prodParameter;
}

new LambdaStack(app, `CMKasamaLambdaJson${envKey.toUpperCase()}`, {
  description: `${parameter.projectName}-${parameter.envName}-test-tag`,
  env: {
    account: parameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: parameter.env?.region || process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Repository: `${parameter.projectName}-${parameter.envName}-test-tag`,
    Environment: parameter.envName,
  },

  projectName: parameter.projectName,
  envName: parameter.envName,
  app_log_level: parameter.app_log_level,
});
