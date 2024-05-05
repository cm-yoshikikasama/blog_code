import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface LambdaConstructProps {
  envName: string;
  projectName: string;
  dataSourceBucketName: string;
  dataStoreBucketName: string;
}

export class LambdaConstruct extends Construct {
  public readonly LambdaName: string;
  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);
    // this defines an AWS Lambda resource
    // IAMロールの定義 (Lambda関数で使用する場合)
    const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });
    const pandasLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "AwsSdkPandasLayer",
      "arn:aws:lambda:ap-northeast-1:336392948345:layer:AWSSDKPandas-Python312-Arm64:8"
    );
    this.LambdaName = `${props.projectName}-${props.envName}-etl-handler`;
    new lambda.Function(this, "EtlHandler", {
      functionName: this.LambdaName,
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset("../resources/lambda"),
      handler: "etl_handler.main",
      layers: [pandasLayer],
      memorySize: 512,
      timeout: cdk.Duration.seconds(900),
      role: lambdaRole,
      environment: {
        S3_OUTPUT_BUCKET: props.dataStoreBucketName,
        S3_OUTPUT_KEY_PREFIX: "output/",
      },
      architecture: lambda.Architecture.ARM_64,
    });

    // 任意の追加ポリシーをLambdaのIAMロールにアタッチ
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:ListBucket", "s3:GetObject", "s3:PutObject"],
        resources: [
          `arn:aws:s3:::${props.dataStoreBucketName}`,
          `arn:aws:s3:::${props.dataStoreBucketName}/*`,
          `arn:aws:s3:::${props.dataSourceBucketName}`,
          `arn:aws:s3:::${props.dataSourceBucketName}/*`,
        ],
      })
    );
  }
}
