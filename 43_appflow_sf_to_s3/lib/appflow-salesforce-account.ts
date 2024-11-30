import * as fs from "node:fs";
import * as cdk from "aws-cdk-lib";
import * as appflow from "aws-cdk-lib/aws-appflow";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as stepfunctionsTasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as athena from "aws-cdk-lib/aws-athena";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface AppFlowStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}

export class AppFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppFlowStackProps) {
    super(scope, id, props);
    // S3バケット名
    const outDataBucketName = `cm-kasama-sf-test`;
    const outDataBucket = s3.Bucket.fromBucketName(
      this,
      "OutDataBucket",
      outDataBucketName
    );

    const salesforceConnectionName = "cm-kasama-sf-connector";
    // Secret Managerからの参照を追加

    const salesforceCredentials = secretsmanager.Secret.fromSecretNameV2(
      this,
      "SalesforceCredentials",
      `/salesforce/${props.envName}/appflow-${salesforceConnectionName}-credentials`
    );
    // Salesforceコネクタプロファイルの作成
    const salesforceConnectorProfile = new appflow.CfnConnectorProfile(
      this,
      "SalesforceConnectorProfile",
      {
        connectorProfileName: salesforceConnectionName,
        connectorType: "Salesforce",
        connectionMode: "Public",
        connectorProfileConfig: {
          connectorProfileProperties: {
            salesforce: {
              instanceUrl:
                "https://classmethod6-dev-ed.develop.my.salesforce.com",
              isSandboxEnvironment: false,
              usePrivateLinkForMetadataAndAuthorization: false,
            },
          },
          connectorProfileCredentials: {
            salesforce: {
              // Secret Managerから認証情報を取得
              accessToken: salesforceCredentials
                .secretValueFromJson("accessToken")
                .unsafeUnwrap(),
              refreshToken: salesforceCredentials
                .secretValueFromJson("refreshToken")
                .unsafeUnwrap(),
            },
          },
        },
      }
    );
    // AppFlowのフロー名
    const appFlowName =
      props.projectName + "-" + props.envName + "-sf-account-flow";

    // AppFlowのフロー定義
    const salesforceFlow = new appflow.CfnFlow(this, "SalesforceAccountFlow", {
      flowName: appFlowName,
      destinationFlowConfigList: [
        {
          connectorType: "S3",
          destinationConnectorProperties: {
            s3: {
              bucketName: outDataBucketName,
              // bucketPrefix: ``,
              s3OutputFormatConfig: {
                fileType: "PARQUET",
                aggregationConfig: {
                  aggregationType: "None",
                },
                prefixConfig: {
                  prefixType: "PATH",
                  prefixFormat: "DAY",
                },
                preserveSourceDataTyping: true,
              },
            },
          },
        },
      ],
      sourceFlowConfig: {
        connectorType: "Salesforce",
        connectorProfileName: salesforceConnectorProfile.connectorProfileName,
        sourceConnectorProperties: {
          salesforce: {
            object: "Account",
            // 新しく追加されたフィールドを自動的にインポート
            enableDynamicFieldUpdate: false,
            includeDeletedRecords: false,
          },
        },
        incrementalPullConfig: {
          datetimeTypeFieldName: "LastModifiedDate",
        },
      },
      tasks: [
        {
          taskType: "Map_all",
          sourceFields: [],
          taskProperties: [],
        },
      ],
      triggerConfig: {
        triggerType: "Scheduled",
        triggerProperties: {
          scheduleStartTime: Math.floor(
            new Date("2024-12-20T11:25:00+09:00").getTime() / 1000
          ),
          scheduleExpression: "rate(1days)",
          timeZone: "Asia/Tokyo",
          scheduleOffset: 0,
          dataPullMode: "Incremental",
        },
      },
      flowStatus: "Suspended",
    });

    // コネクタプロファイルへの依存関係を追加

    salesforceFlow.addDependsOn(salesforceConnectorProfile);
    // AppFlow Failure EventBridgeルールの作成
    const appFlowFailureRule = new events.Rule(this, "AppFlowFailureRule", {
      eventPattern: {
        source: ["aws.appflow"],
        detailType: ["AppFlow End Flow Run Report"],
        detail: {
          "flow-name": [appFlowName],
          status: ["Execution Failed"],
        },
      },
    });
    // SNS Topic for notifications
    const errorNotificationTopic = new sns.Topic(
      this,
      "ErrorNotificationTopic",
      {
        topicName: `${props.projectName}-${props.envName}-error-notification-topic`,
      }
    );
    // EventBridgeルールのターゲットとしてSNSトピックを設定
    appFlowFailureRule.addTarget(
      new targets.SnsTopic(errorNotificationTopic, {
        message: events.RuleTargetInput.fromText(
          `AppFlow execution failed for flow: ${appFlowName}. Please check the AWS AppFlow console for more details.`
        ),
      })
    );

    // Athena Workgroup
    const athenaWorkgroup = new athena.CfnWorkGroup(this, "AthenaWorkgroup", {
      name: `${props.projectName}-${props.envName}-workgroup`,
      recursiveDeleteOption: true,
      state: "ENABLED",
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${outDataBucketName}/athena-results/`,
        },
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        engineVersion: {
          selectedEngineVersion: "Athena engine version 3",
        },
      },
    });
    const mergeQueryString = fs
      .readFileSync(
        "./sql/dml/merge_cm_kasama_sf_test.account_latest.sql",
        "utf8"
      )
      .replace(/{env}/g, props.envName);

    // StepFunctions定義
    const succeed = new stepfunctions.Succeed(this, "Succeed");
    const fail = new stepfunctions.Fail(this, "Fail");
    const syncExecuteAthenaQuery =
      new stepfunctionsTasks.AthenaStartQueryExecution(
        this,
        "SyncExecuteAthenaQuery",
        {
          queryString: stepfunctions.JsonPath.format(
            mergeQueryString,
            stepfunctions.JsonPath.stringAt("$.yyyy"),
            stepfunctions.JsonPath.stringAt("$.mm"),
            stepfunctions.JsonPath.stringAt("$.dd")
          ),
          workGroup: athenaWorkgroup.name,
          integrationPattern: stepfunctions.IntegrationPattern.RUN_JOB,
          resultPath: "$.queryExecution.QueryExecution",
        }
      );
    const sendErrorNotification = new stepfunctionsTasks.SnsPublish(
      this,
      "SendErrorNotification",
      {
        topic: errorNotificationTopic,
        message: stepfunctions.TaskInput.fromText(
          "Athena query execution failed or was cancelled."
        ),
      }
    );
    // mergeが失敗したときにエラーキャッチする
    syncExecuteAthenaQuery.addCatch(
      stepfunctions.Chain.start(sendErrorNotification).next(fail),
      {
        errors: ["States.ALL"],
        resultPath: "$.error",
      }
    );

    const formatDate = new stepfunctions.Pass(this, "FormatDate", {
      parameters: {
        "yyyy.$":
          "States.ArrayGetItem(States.StringSplit(States.ArrayGetItem(States.StringSplit($.endTime, 'T'), 0), '-'), 0)",

        "mm.$":
          "States.ArrayGetItem(States.StringSplit(States.ArrayGetItem(States.StringSplit($.endTime, 'T'), 0), '-'), 1)",
        "dd.$":
          "States.ArrayGetItem(States.StringSplit(States.ArrayGetItem(States.StringSplit($.endTime, 'T'), 0), '-'), 2)",
      },
    });
    const definition = stepfunctions.Chain.start(formatDate)
      .next(syncExecuteAthenaQuery)
      .next(succeed);
    const stateMachine = new stepfunctions.StateMachine(
      this,
      "AthenaQueryStateMachine",
      {
        definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
        timeout: cdk.Duration.minutes(30),
      }
    );

    // AthenaとS3の権限をStepFunctionsのロールに追加
    stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "glue:GetTable",
          "glue:UpdateTable",
          "glue:GetPartitions",
          "glue:GetDatabase",
          "lakeformation:GetDataAccess",
        ],
        resources: ["*"],
      })
    );

    stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject",
        ],
        resources: [outDataBucket.bucketArn, `${outDataBucket.bucketArn}/*`],
      })
    );
    // AppFlow成功時のEventBridgeルール
    const appFlowSuccessRule = new events.Rule(this, "AppFlowSuccessRule", {
      eventPattern: {
        source: ["aws.appflow"],
        detailType: ["AppFlow End Flow Run Report"],
        detail: {
          "flow-name": [appFlowName],
          status: ["Execution Successful"],
        },
      },
    });
    // AppFlow Successful EventBridgeルールのターゲットとしてStepFunctionsを設定
    appFlowSuccessRule.addTarget(
      new targets.SfnStateMachine(stateMachine, {
        input: events.RuleTargetInput.fromObject({
          event: events.EventField.fromPath("$"),
          // queryString: mergeQueryString,
          flowName: events.EventField.fromPath("$.detail.flow-name"),
          endTime: events.EventField.fromPath("$.detail.end-time"),
        }),
      })
    );
  }
}
