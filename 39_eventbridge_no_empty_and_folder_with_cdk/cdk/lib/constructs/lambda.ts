import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface LambdaConstructProps {
  envName: string;
  projectName: string;
}

export class LambdaConstruct extends Construct {
  public readonly lambdaArn: string;
  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);
    const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });
    const lambdaName = `${props.projectName}-${props.envName}-event-trigger-check-handler`;
    const lambdaFunction = new lambda.Function(this, "EtlHandler", {
      functionName: lambdaName,
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset("../resources/"),
      handler: "handler.main",
      memorySize: 512,
      timeout: cdk.Duration.seconds(900),
      role: lambdaRole,
      architecture: lambda.Architecture.ARM_64,
    });
    this.lambdaArn = lambdaFunction.functionArn;
  }
}
