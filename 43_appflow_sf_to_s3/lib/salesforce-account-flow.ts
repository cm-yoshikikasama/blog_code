import * as appflow from 'aws-cdk-lib/aws-appflow';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

// フロー設定
const FLOW_CONFIG = {
  objectName: 'Account',
  flowStatus: 'Suspended',
  schedule: {
    startTime: '2099-01-01T00:00:00+09:00',
    expression: 'rate(1days)',
    offset: 0,
  },
  s3Prefix: 'sf-account-flow',
};
export interface SalesforceFlowProps {
  envName: string;
  projectName: string;
  outDataBucket: s3.IBucket;
  salesforceConnectorProfile: string;
  errorNotificationTopic: sns.ITopic;
}

export class SalesforceAccountFlow extends Construct {
  constructor(scope: Construct, id: string, props: SalesforceFlowProps) {
    super(scope, id);

    // AppFlowのフロー名
    const appFlowName = `${props.projectName}-${props.envName}-${FLOW_CONFIG.s3Prefix}`;
    // AppFlowのフロー定義
    const flow = new appflow.CfnFlow(this, 'SalesforceAccountFlow', {
      flowName: appFlowName,
      destinationFlowConfigList: [
        {
          connectorType: 'S3',
          destinationConnectorProperties: {
            s3: {
              bucketName: props.outDataBucket.bucketName,
              s3OutputFormatConfig: {
                fileType: 'PARQUET',
                aggregationConfig: {
                  aggregationType: 'None',
                },
                prefixConfig: {
                  prefixType: 'PATH',
                  prefixFormat: 'DAY',
                },
                preserveSourceDataTyping: true,
              },
            },
          },
        },
      ],
      sourceFlowConfig: {
        connectorType: 'Salesforce',
        connectorProfileName: props.salesforceConnectorProfile,
        sourceConnectorProperties: {
          salesforce: {
            object: FLOW_CONFIG.objectName,
            // 新しく追加されたフィールドを自動的にインポート
            enableDynamicFieldUpdate: false,
            includeDeletedRecords: true,
          },
        },
        incrementalPullConfig: {
          datetimeTypeFieldName: 'LastModifiedDate',
        },
      },
      tasks: [
        {
          taskType: 'Map_all',
          sourceFields: [],
          taskProperties: [],
        },
      ],
      triggerConfig: {
        triggerType: 'Scheduled',
        triggerProperties: {
          scheduleStartTime: Math.floor(new Date(FLOW_CONFIG.schedule.startTime).getTime() / 1000),
          scheduleExpression: FLOW_CONFIG.schedule.expression,
          timeZone: 'Asia/Tokyo',
          scheduleOffset: FLOW_CONFIG.schedule.offset,
          dataPullMode: 'Incremental',
        },
      },
      flowStatus: FLOW_CONFIG.flowStatus,
    });

    // AppFlow Failure EventBridgeルールの作成
    const appFlowFailureRule = new events.Rule(this, 'AppFlowFailureRule', {
      eventPattern: {
        source: ['aws.appflow'],
        detailType: ['AppFlow End Flow Run Report'],
        detail: {
          'flow-name': [appFlowName],
          status: ['Execution Failed'],
        },
      },
    });
    // EventBridgeルールのターゲットとしてSNSトピックを設定
    appFlowFailureRule.addTarget(
      new targets.SnsTopic(props.errorNotificationTopic, {
        message: events.RuleTargetInput.fromText(
          `AppFlow execution failed for flow: ${appFlowName}. Please check the AWS AppFlow console for more details.`
        ),
      })
    );
  }
}
