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
  public readonly dataSourceBucket: Bucket;
  public readonly dataStoreBucket: Bucket;
  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    this.dataSourceBucket = new Bucket(this, "DataSourceBucket", {
      bucketName: `${props.projectName}-${props.envName}-data-source`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS_MANAGED,
      versioned: true,
      eventBridgeEnabled: true,
    });
  }
}
