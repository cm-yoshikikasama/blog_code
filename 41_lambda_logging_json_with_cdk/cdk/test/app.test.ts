import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LambdaStack } from '../lib/lambda-logging-json-stack';
import { devParameter } from '../parameter';

test('Snapshot test for ServerlessApi Stack', () => {
  const app = new cdk.App();
  const stack = new LambdaStack(app, 'ETL', {
    description: `${devParameter.projectName}-${devParameter.envName}-test-tag`,
    env: {
      account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
      region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
    },
    tags: {
      Repository: `${devParameter.projectName}-${devParameter.envName}-test-tag`,
      Environment: devParameter.envName,
    },

    projectName: devParameter.projectName,
    envName: devParameter.envName,
    app_log_level: devParameter.app_log_level,
  });
  expect(Template.fromStack(stack)).toMatchSnapshot();
});
