import type { Environment } from 'aws-cdk-lib';

export interface AppParameter {
  env?: Environment;
  envName: string;
  projectName: string;
}

export const devParameter: AppParameter = {
  envName: 'dev',
  projectName: 'cm-kasama-iceberg-duckdb-lambda',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
};
