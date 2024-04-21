import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { S3Construct } from "../constructs/s3";
import {
  StepFunctionsConstruct,
  StepFunctionsConstructProps,
} from "../constructs/stepfunctions";
import {
  EventBridgeConstruct,
  EventBridgeConstructProps,
} from "../constructs/eventbridge";

export interface S3CopyFlowStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}

export class S3CopyFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3CopyFlowStackProps) {
    super(scope, id, props);
    // S3Construct のインスタンス化
    const s3Construct = new S3Construct(this, "S3", {
      envName: props.envName,
      projectName: props.projectName,
    });
    // StepFunctionsConstruct
    const stepFunctionsConstruct = new StepFunctionsConstruct(
      this,
      "StepFunctions",
      {
        envName: props.envName,
        projectName: props.projectName,
        dataSourceBucketName: s3Construct.dataSourceBucket.bucketName,
        dataStoreBucketName: s3Construct.dataStoreBucket.bucketName,
      } as StepFunctionsConstructProps
    );
    // EventBridgeStack のインスタンス化
    new EventBridgeConstruct(this, "EventBridge", {
      envName: props.envName,
      projectName: props.projectName,
      stateMachineArn: stepFunctionsConstruct.stateMachine.stateMachineArn,
    } as EventBridgeConstructProps);
  }
}
