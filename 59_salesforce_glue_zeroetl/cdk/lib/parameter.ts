import type { Environment } from 'aws-cdk-lib';

export interface AppParameter {
  env?: Environment;
  envName: string;
  projectName: string;
  syncFrequencyMinutes: number;
  dataFilter: string;
}

export const devParameter: AppParameter = {
  envName: 'dev',
  projectName: 'my-sf-zeroetl',
  syncFrequencyMinutes: 15, // 15 minutes
  // syncFrequencyMinutes: 1440,  // 24 hours
  dataFilter: 'include:Account,include:Contact',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
};
