#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DmsServerlessStack } from "../lib/dms-serverless-stack";

const app = new cdk.App();

new DmsServerlessStack(app, "CmKasamaDmsServerlessStack", {
	description: "CmKasamaDmsServerlessStack",
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	tags: {
		Repository: "CmKasamaDmsServerlessStack-test-tag",
	},

	projectName: "cm-kasama",
	envName: "dev",
});
