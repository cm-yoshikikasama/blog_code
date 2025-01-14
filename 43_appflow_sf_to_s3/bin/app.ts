#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AppFlowStack } from "../lib/salesforce-appflow-stack";
import { devParameter, prodParameter } from "../parameter";

const app = new cdk.App();

const envKey = app.node.tryGetContext("environment") ?? "dev"; // default: dev

let parameter;

if (envKey === "dev") {
  parameter = devParameter;
} else {
  parameter = prodParameter;
}

new AppFlowStack(app, `CMKasamaAppFlow${envKey.toUpperCase()}`, {
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
});
