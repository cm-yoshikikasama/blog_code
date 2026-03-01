import type { Environment } from 'aws-cdk-lib';

export interface AppParameter {
  env?: Environment;
  envName: string;
  projectName: string;
  scheduleExpression: string;
}

export const devParameter: AppParameter = {
  envName: 'dev',
  projectName: 'sample-data-pipeline',
  scheduleExpression: 'cron(0 9 * * ? *)',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
};
