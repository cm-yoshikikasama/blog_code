import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { S3Construct } from "../constructs/s3";
import { LambdaConstruct, LambdaConstructProps } from "../constructs/lambda";
import {
  StepFunctionsConstruct,
  StepFunctionsConstructProps,
} from "../constructs/step-functions";
import {
  EventBridgeConstruct,
  EventBridgeConstructProps,
} from "../constructs/eventbridge";

export interface ETLStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}

export class ETLStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ETLStackProps) {
    super(scope, id, props);
    const s3Construct = new S3Construct(this, "S3", {
      envName: props.envName,
      projectName: props.projectName,
    });
    const lambdaConstruct = new LambdaConstruct(this, "Lambda", {
      envName: props.envName,
      projectName: props.projectName,
      dataSourceBucketName: s3Construct.dataSourceBucket.bucketName,
      dataStoreBucketName: s3Construct.dataStoreBucket.bucketName,
    } as LambdaConstructProps);

    const stepFunctionsConstruct = new StepFunctionsConstruct(
      this,
      "StepFunctions",
      {
        envName: props.envName,
        projectName: props.projectName,
        dataSourceBucketName: s3Construct.dataSourceBucket.bucketName,
        dataStoreBucketName: s3Construct.dataStoreBucket.bucketName,
        lambdaName: lambdaConstruct.LambdaName,
      } as StepFunctionsConstructProps
    );
    new EventBridgeConstruct(this, "EventBridge", {
      envName: props.envName,
      projectName: props.projectName,
      dataSourceBucketName: s3Construct.dataSourceBucket.bucketName,
      stateMachineArn: stepFunctionsConstruct.stateMachine.stateMachineArn,
    } as EventBridgeConstructProps);
  }
}
