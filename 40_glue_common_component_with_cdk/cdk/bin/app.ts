#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ETLStack } from "../lib/stack/etl-stack";
import { devParameter } from "../parameter";

const app = new cdk.App();
new ETLStack(app, "CMKasamaETL40", {
  description: "ETL (tag:kasama-test-tag)",
  env: {
    account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Repository: "kasama-test-tag",
    Environment: devParameter.envName,
  },

  projectName: devParameter.projectName,
  envName: devParameter.envName,
});
