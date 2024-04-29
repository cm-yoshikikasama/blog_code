// import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfn_tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";

export interface StepFunctionsConstructProps {
  envName: string;
  projectName: string;
  dataSourceBucketName: string;
  dataStoreBucketName: string;
  glueJobName: string;
}
export class StepFunctionsConstruct extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  constructor(
    scope: Construct,
    id: string,
    props: StepFunctionsConstructProps
  ) {
    super(scope, id);

    const stepFunctionsRole = new iam.Role(this, `StepFunctionsRole`, {
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
      description: "An IAM role for Step Functions to access AWS services",
      roleName: `${props.projectName}-${props.envName}-etl-stepfunctions-role`,
    });

    stepFunctionsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket", "s3:GetObject", "s3:PutObject"],
        resources: [
          `arn:aws:s3:::${props.dataSourceBucketName}`,
          `arn:aws:s3:::${props.dataSourceBucketName}/*`,
          `arn:aws:s3:::${props.dataStoreBucketName}`,
          `arn:aws:s3:::${props.dataStoreBucketName}/*`,
        ],
      })
    );
    stepFunctionsRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"], // 必要に応じてリソースをより具体的に指定
        actions: ["glue:StartJobRun"], // 必要なアクションに絞り込むことを推奨
      })
    );
    // Glue Job の実行
    const startGlueJob = new sfn_tasks.GlueStartJobRun(this, "StartGlueJob", {
      glueJobName: props.glueJobName,
      arguments: sfn.TaskInput.fromObject({
        // S3イベントから取得した入力パス
        "--S3_INPUT_BUCKET.$": "$.detail.bucket.name",
        "--S3_INPUT_KEY.$": "$.detail.object.key",
      }),
      integrationPattern: sfn.IntegrationPattern.RUN_JOB, // タスクが終了するまで待機
    });
    /// ジョブ失敗時の振る舞いを定義
    const jobFailed = new sfn.Fail(this, "JobFailed", {
      errorPath: "$.Error",
      causePath: "$.Cause",
    });
    startGlueJob.addCatch(jobFailed, {
      errors: ["States.ALL"],
    });

    const definitionBody = sfn.DefinitionBody.fromChainable(startGlueJob);

    this.stateMachine = new sfn.StateMachine(this, "StateMachine", {
      stateMachineName: `${props.projectName}-${props.envName}-etl-statemachine`,
      definitionBody: definitionBody,
      role: stepFunctionsRole,
    });
  }
}
