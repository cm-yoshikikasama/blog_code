import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as athena from "aws-cdk-lib/aws-athena";
import { Construct } from "constructs";
import { SalesforceAccountFlow } from "./salesforce-account-flow";

export interface AppFlowStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}

export class AppFlowStack extends cdk.Stack {
  public readonly outDataBucket: s3.IBucket;
  public readonly errorNotificationTopic: sns.Topic;
  public readonly salesforceConnectorProfile: string;
  public readonly athenaWorkgroup: athena.CfnWorkGroup;

  constructor(scope: Construct, id: string, props: AppFlowStackProps) {
    super(scope, id, props);

    // 共通リソースの作成
    this.outDataBucket = this.createS3Bucket(props);
    this.errorNotificationTopic = this.createErrorNotificationTopic(props);
    this.salesforceConnectorProfile = `${props.projectName}-${props.envName}-salesforce-flow-connector`;

    // Salesforceオブジェクトごとのフロー作成
    new SalesforceAccountFlow(this, "AccountFlow", {
      envName: props.envName,
      projectName: props.projectName,
      outDataBucket: this.outDataBucket,
      salesforceConnectorProfile: this.salesforceConnectorProfile,
      errorNotificationTopic: this.errorNotificationTopic,
    });
  }

  private createS3Bucket(props: AppFlowStackProps): s3.IBucket {
    return s3.Bucket.fromBucketName(this, "OutDataBucket", `your-s3-bucket`);
  }

  private createErrorNotificationTopic(props: AppFlowStackProps): sns.Topic {
    return new sns.Topic(this, "ErrorNotificationTopic", {
      topicName: `${props.projectName}-${props.envName}-error-notification-topic`,
    });
  }
}
