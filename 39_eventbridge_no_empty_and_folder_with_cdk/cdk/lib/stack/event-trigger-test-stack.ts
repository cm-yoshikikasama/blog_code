import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { EventBridgeConstruct, type EventBridgeConstructProps } from '../constructs/eventbridge';
import { LambdaConstruct, type LambdaConstructProps } from '../constructs/lambda';
import { S3Construct } from '../constructs/s3';

export interface ETLStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}

export class ETLStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ETLStackProps) {
    super(scope, id, props);
    const s3Construct = new S3Construct(this, 'S3', {
      envName: props.envName,
      projectName: props.projectName,
    });
    const lambdaConstruct = new LambdaConstruct(this, 'Lambda', {
      envName: props.envName,
      projectName: props.projectName,
    } as LambdaConstructProps);

    new EventBridgeConstruct(this, 'EventBridge', {
      envName: props.envName,
      projectName: props.projectName,
      dataSourceBucketName: s3Construct.dataSourceBucket.bucketName,
      lambdaFunctionArn: lambdaConstruct.lambdaArn,
    } as EventBridgeConstructProps);
  }
}
