// import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as iam from "aws-cdk-lib/aws-iam";

export interface EventBridgeConstructProps {
  envName: string;
  projectName: string;
  stateMachineArn: string;
}

export class EventBridgeConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EventBridgeConstructProps) {
    super(scope, id);

    // 日次で20:00 (JST) に発火するEventBridgeのルールを追加
    const dailyRule = new events.Rule(this, `DailyRule`, {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "11",
        day: "*",
        month: "*",
        year: "*",
      }),
      ruleName: `${props.projectName}-${props.envName}-daily-rule`,
    });
    // EventBridge が Step Functions を起動するための IAM ロールを作成
    const eventBridgeExecutionRole = new iam.Role(
      this,
      `EventBridgeExecutionRole`,
      {
        assumedBy: new iam.ServicePrincipal("events.amazonaws.com"), // 信頼ポリシー設定
        description:
          "An IAM role for EventBridge to Start Step Functions Execution",
        roleName: `EventBridgeExecutionRoleForStepFunctions-${props.envName}`,
      }
    );

    eventBridgeExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["states:StartExecution"], // 許可するアクション
        resources: [props.stateMachineArn], // ステートマシンのARN
      })
    );
    // ステップ関数をS3 Put Eventのターゲットとして設定
    const stateMachine = sfn.StateMachine.fromStateMachineArn(
      this,
      "ImportedStateMachine",
      props.stateMachineArn
    );
    dailyRule.addTarget(
      new eventsTargets.SfnStateMachine(stateMachine, {
        role: eventBridgeExecutionRole,
      })
    );
  }
}
