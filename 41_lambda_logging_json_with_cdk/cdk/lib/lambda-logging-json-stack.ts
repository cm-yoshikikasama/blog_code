import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export interface LambdaStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
  app_log_level: string;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    const customLambdaName = `${props.projectName}-${props.envName}-json-custom-log-test-handler`;
    const defaultLambdaName = `${props.projectName}-${props.envName}-json-default-log-test-handler`;

    new lambda.Function(this, "JsonCustomLogTestHandler", {
      functionName: customLambdaName,
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset("../resources/lambda"),
      handler: "lambda_handler_custom.lambda_handler", // ハンドラー名を修正
      memorySize: 512,
      timeout: cdk.Duration.seconds(900),
      role: lambdaRole,
      environment: {},
      architecture: lambda.Architecture.ARM_64,
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2:
        lambda.ApplicationLogLevel[
          props.app_log_level as keyof typeof lambda.ApplicationLogLevel
        ],
    });
    new lambda.Function(this, "JsonDefaultLogTestHandler", {
      functionName: defaultLambdaName,
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset("../resources/lambda"),
      handler: "lambda_handler_default.lambda_handler", // ハンドラー名を修正
      memorySize: 512,
      timeout: cdk.Duration.seconds(900),
      role: lambdaRole,
      environment: {},
      architecture: lambda.Architecture.ARM_64,
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2:
        lambda.ApplicationLogLevel[
          props.app_log_level as keyof typeof lambda.ApplicationLogLevel
        ],
    });
  }
}
