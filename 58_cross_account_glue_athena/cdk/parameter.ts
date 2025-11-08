import { Environment } from 'aws-cdk-lib';

export interface AppParameter {
  env?: Environment;
  envName: string;
  projectName: string;
}

export const devParameter: AppParameter = {
  envName: 'dev',
  projectName: 'cm-kasama-cross-account',
  env: {},
};

export const prodParameter: AppParameter = {
  envName: 'prod',
  projectName: 'cm-kasama-cross-account',
  env: {},
};
