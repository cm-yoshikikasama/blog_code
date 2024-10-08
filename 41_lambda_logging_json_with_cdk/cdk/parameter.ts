import { Environment } from "aws-cdk-lib";

// Parameters for Application
export interface AppParameter {
  env: Environment;
  envName: string;
  projectName: string;
  app_log_level: string;
}

// Example
export const devParameter: AppParameter = {
  envName: "dev",
  projectName: "cm-kasama",
  env: {},
  app_log_level: "DEBUG",
  // env: { account: "xxxxxx", region: "ap-northeast-1" },
};

export const prodParameter: AppParameter = {
  envName: "prod",
  projectName: "cm-kasama",
  env: {},
  app_log_level: "INFO",
  // env: { account: "xxxxxx", region: "ap-northeast-1" },
};
