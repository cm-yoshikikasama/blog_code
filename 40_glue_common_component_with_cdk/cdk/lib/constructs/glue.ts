import { Construct } from "constructs";
import * as glue from "aws-cdk-lib/aws-glue";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

export interface GlueConstructProps {
  envName: string;
  projectName: string;
  dataSourceBucketName: string;
  dataStoreBucketName: string;
  sysBucketName: string;
}

export class GlueConstruct extends Construct {
  public readonly glueJobName: string;
  constructor(scope: Construct, id: string, props: GlueConstructProps) {
    super(scope, id);

    const glueJobRole = new iam.Role(this, "GlueJobRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      description: "Role for Glue Job execution",
      roleName: `${props.projectName}-${props.envName}-etl-glue-execution-role`,
    });

    glueJobRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["arn:aws:logs:*:*:*:/aws-glue/*"],
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
      })
    );
    glueJobRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:CopyObject",
        ],
        resources: [
          `arn:aws:s3:::${props.dataSourceBucketName}`,
          `arn:aws:s3:::${props.dataSourceBucketName}/*`,
          `arn:aws:s3:::${props.dataStoreBucketName}`,
          `arn:aws:s3:::${props.dataStoreBucketName}/*`,
          `arn:aws:s3:::${props.sysBucketName}`,
          `arn:aws:s3:::${props.sysBucketName}/*`,
        ],
      })
    );

    this.glueJobName = `${props.projectName}-${props.envName}-glue-job`;

    // Glue Jobの定義
    new glue.CfnJob(this, "GlueJob", {
      name: this.glueJobName,
      role: glueJobRole.roleArn,
      command: {
        name: "pythonshell",
        pythonVersion: "3.9",
        scriptLocation: `s3://${props.sysBucketName}/glue-jobs/etl_script.py`,
      },
      executionProperty: {
        maxConcurrentRuns: 5,
      },
      defaultArguments: {
        "--TempDir": `s3://${props.sysBucketName}/tmp`,
        "--job-language": "python",
        "--extra-py-files": `s3://${props.sysBucketName}/glue-jobs/common/data_processing.py,s3://${props.sysBucketName}/glue-jobs/common/get_logger.py`,
        "--S3_OUTPUT_BUCKET": props.dataStoreBucketName,
        "--S3_OUTPUT_KEY": `output/`,
      },
    });
  }
}
