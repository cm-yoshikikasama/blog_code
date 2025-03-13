#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LakeFormationHybridStack } from "../lib/lakeformation";

const app = new cdk.App();
new LakeFormationHybridStack(app, "CMKasamaLakeFormation", {
	description: "ETL (tag:kasama-test-tag)",
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	tags: {
		Repository: "kasama-test-tag",
	},

	projectName: "project",
	envName: "dev",
});
