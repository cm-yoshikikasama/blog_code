import { Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfn_tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";

export interface StepFunctionsConstructProps {
  envName: string;
  projectName: string;
  dataSourceBucketName: string;
  dataStoreBucketName: string;
  lambdaName: string;
}

export class StepFunctionsConstruct extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(
    scope: Construct,
    id: string,
    props: StepFunctionsConstructProps
  ) {
    super(scope, id);

    const stepFunctionsRole = new iam.Role(this, `StepFunctionsRole`, {
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
      description: "An IAM role for Step Functions to access AWS services",
      roleName: `${props.projectName}-${props.envName}-stepfunctions-role`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaRole"
        ),
      ],
    });

    stepFunctionsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:CopyObject",
        ],
        resources: [
          `arn:aws:s3:::${props.dataSourceBucketName}`,
          `arn:aws:s3:::${props.dataSourceBucketName}/*`,
          `arn:aws:s3:::${props.dataStoreBucketName}`,
          `arn:aws:s3:::${props.dataStoreBucketName}/*`,
        ],
      })
    );

    const lambdaFunction = lambda.Function.fromFunctionName(
      this,
      "LambdaFunctionByName",
      props.lambdaName
    );

    // Lambda Invoke Task
    const lambdaInvoke = new sfn_tasks.LambdaInvoke(
      this,
      "InvokeLambdaFunction",
      {
        lambdaFunction: lambdaFunction,
        inputPath: "$",
        outputPath: "$.Payload",
      }
    );
    /// ジョブ失敗時の振る舞いを定義
    const jobFailed = new sfn.Fail(this, "JobFailed", {
      errorPath: "$.Error",
      causePath: "$.Cause",
    });
    lambdaInvoke.addCatch(jobFailed, {
      errors: ["States.ALL"],
    });
    // Define the State Machine
    const definitionBody = sfn.DefinitionBody.fromChainable(lambdaInvoke);
    this.stateMachine = new sfn.StateMachine(this, "StateMachine", {
      definitionBody: definitionBody,
      stateMachineName: `${props.projectName}-${props.envName}-statemachine`,
      role: stepFunctionsRole,
    });
  }
}
