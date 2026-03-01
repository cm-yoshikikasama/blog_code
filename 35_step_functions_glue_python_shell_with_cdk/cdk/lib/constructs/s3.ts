import * as cdk from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface S3ConstructProps {
  envName: string;
  projectName: string;
}

export class S3Construct extends Construct {
  public readonly dataSourceBucket: Bucket;
  public readonly dataStoreBucket: Bucket;
  public readonly sysBucket: Bucket;
  constructor(scope: Construct, id: string, props: S3ConstructProps) {
    super(scope, id);

    this.dataSourceBucket = new Bucket(this, 'DataSourceBucket', {
      bucketName: `${props.projectName}-${props.envName}-data-source`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS_MANAGED,
      versioned: true,
      eventBridgeEnabled: true,
    });
    this.dataStoreBucket = new Bucket(this, 'DataStoreBucket', {
      bucketName: `${props.projectName}-${props.envName}-data-store`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS_MANAGED,
      versioned: true,
    });
    this.sysBucket = new Bucket(this, 'SysBucket', {
      bucketName: `${props.projectName}-${props.envName}-sys`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS_MANAGED,
      versioned: true,
      eventBridgeEnabled: true,
    });
    // Glue スクリプトを S3 バケットにデプロイ
    new cdk.aws_s3_deployment.BucketDeployment(this, 'DeployGlueScript', {
      sources: [cdk.aws_s3_deployment.Source.asset('../resources')],
      destinationBucket: this.sysBucket,
      destinationKeyPrefix: 'glue-jobs',
    });
  }
}
