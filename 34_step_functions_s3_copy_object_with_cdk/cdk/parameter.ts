import { Environment } from "aws-cdk-lib";

// Parameters for Application
export interface AppParameter {
  env: Environment;
  envName: string;
  projectName: string;
}

// Example
export const devParameter: AppParameter = {
  envName: "dev",
  projectName: "kasama",
  env: { account: "123456789012", region: "ap-northeast-1" },
};
