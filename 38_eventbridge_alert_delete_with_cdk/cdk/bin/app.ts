#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ETLStack } from "../lib/stack/etl-stack";
import { devParameter, prodParameter } from "../parameter";

const app = new cdk.App();

// This context need to be specified in args
const argContext = "environment";
let envKey = app.node.tryGetContext(argContext);
if (envKey == undefined) {
  console.warn(
    `Warning: Environment key not specified, defaulting to 'dev'. For specifying environment, use context option. ex) cdk deploy -c ${argContext}=dev/prod`
  );
  // throw new Error(
  //   `Please specify environment with context option. ex) cdk deploy -c ${argContext}=dev`
  // );
  envKey = "dev";
}

let parameter;

if (envKey === "dev") {
  parameter = devParameter;
} else {
  parameter = prodParameter;
}

new ETLStack(app, `CMKasamaETL${envKey.toUpperCase()}`, {
  description: `${parameter.projectName}-${parameter.envName}-test-tag`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  // env: {
  //   account: parameter.env?.account,
  //   region: parameter.env?.region,
  // },
  // env: {
  //   account: process.env.CDK_DEFAULT_ACCOUNT,
  //   region: process.env.CDK_DEFAULT_REGION,
  // },
  // env: {
  //   account: parameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
  //   region: parameter.env?.region || process.env.CDK_DEFAULT_REGION,
  // },

  tags: {
    Repository: `${parameter.projectName}-${parameter.envName}-test-tag`,
    Environment: parameter.envName,
  },

  projectName: parameter.projectName,
  envName: parameter.envName,
});
