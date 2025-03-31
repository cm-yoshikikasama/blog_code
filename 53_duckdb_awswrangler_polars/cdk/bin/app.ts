#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LambdaStack } from "../lib/lambda-stack";

const app = new cdk.App();

new LambdaStack(app, `CmKasamaLambdaStack`, {
	description: `CmKasamaLambdaStack`,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	tags: {
		Repository: `CmKasamaLambdaStack-test-tag`,
	},

	projectName: "cm-kasama",
	envName: "dev",
});
