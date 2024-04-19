import * as cdk from "aws-cdk-lib";
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface S3ConstructProps {
  envName: string;
  projectName: string;
}

export class S3Construct extends Construct {
  public readonly dataInputBucket: Bucket;
  public readonly dataOutputBucket: Bucket;
  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    this.dataInputBucket = new Bucket(this, "DataInputBucket", {
      bucketName: `${props.projectName}-${props.envName}-datainput`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS_MANAGED,
      versioned: true,
      eventBridgeEnabled: true,
    });
    this.dataOutputBucket = new Bucket(this, "DataOutputBucket", {
      bucketName: `${props.projectName}-${props.envName}-dataoutput`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS_MANAGED,
      versioned: true,
      eventBridgeEnabled: true,
    });
  }
}
