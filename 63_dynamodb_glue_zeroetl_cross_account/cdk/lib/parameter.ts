import type { Environment } from 'aws-cdk-lib';

export interface AppParameter {
  envName: string;
  projectName: string;
  tableName: string;
  refreshIntervalMinutes: number;
  sourceEnv: Required<Environment>;
  targetEnv: Required<Environment>;
}

export const devParameter: AppParameter = {
  envName: 'dev',
  projectName: 'cm-kasama-dynamodb-zeroetl',
  tableName: 'Orders',
  refreshIntervalMinutes: 15,
  sourceEnv: {
    account: '111111111111', // TODO: Replace with Source Account ID
    region: 'ap-northeast-1',
  },
  targetEnv: {
    account: '222222222222', // TODO: Replace with Target Account ID
    region: 'ap-northeast-1',
  },
};
