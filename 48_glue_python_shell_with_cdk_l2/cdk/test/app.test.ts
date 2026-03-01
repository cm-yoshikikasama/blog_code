// test/glue.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GlueStack } from '../lib/glue';

test('Snapshot test for Glue Stack', () => {
  const app = new cdk.App();
  const stack = new GlueStack(app, 'CMKasamaETL', {
    description: 'ETL (tag:kasama-test-tag)',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    tags: {
      Repository: 'kasama-test-tag',
    },
    projectName: 'cm-kasama-dev',
    envName: 'dev',
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
