import type { Environment } from 'aws-cdk-lib';

export interface AppParameter {
  env?: Environment;
  envName: string;
  projectName: string;
  sourceBucketName?: string;
}

export const devParameter: AppParameter = {
  envName: 'dev',
  projectName: 'cm-kasama-duckdb-iceberg-lambda',
  env: {},
  // sourceBucketName: 'cm-kasama-duckdb-iceberg-lambda-dev-source',
};
