import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { S3CopyFlowStack } from "../lib/stack/s3-copy-flow-stack";
import { devParameter } from "../parameter";

test("Snapshot test for ServerlessApi Stack", () => {
  const app = new cdk.App();
  const stack = new S3CopyFlowStack(app, "S3CopyFlow", {
    description: "S3CopyFlow (tag:kasama-test-tag)",
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
  expect(Template.fromStack(stack)).toMatchSnapshot();
});
