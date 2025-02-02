import * as path from "node:path";
import * as gluel2 from "@aws-cdk/aws-glue-alpha";
import * as cdk from "aws-cdk-lib";
import * as glueL1 from "aws-cdk-lib/aws-glue";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";

export interface GlueStackProps extends cdk.StackProps {
	envName: string;
	projectName: string;
}

export class GlueStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: GlueStackProps) {
		super(scope, id, props);

		// ===== 共通のS3バケット設定 =====
		const scriptBucket = new s3.Bucket(this, "ScriptBucket", {
			bucketName: `${props.projectName}-${props.envName}-scripts`,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
		});

		// スクリプトをS3にアップロード
		new s3deploy.BucketDeployment(this, "DeployScript", {
			sources: [
				s3deploy.Source.asset(path.join(__dirname, "../../resources/glue")),
			],
			destinationBucket: scriptBucket,
			destinationKeyPrefix: "scripts",
		});

		// ===== L1 Construct による実装 =====
		// L1用のIAMロール作成 - より詳細な権限設定
		const glueJobRoleL1 = new iam.Role(this, "GlueJobRoleL1", {
			roleName: `${props.projectName}-${props.envName}-etl-glue-l1-execution-role`,
			assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
		});

		// CloudWatchLogsへのアクセス権限を明示的に設定
		glueJobRoleL1.addToPolicy(
			new iam.PolicyStatement({
				resources: ["arn:aws:logs:*:*:*:/aws-glue/*"],
				actions: [
					"logs:CreateLogGroup",
					"logs:CreateLogStream",
					"logs:PutLogEvents",
				],
			}),
		);
		// S3バケットへの読み取り権限を付与
		scriptBucket.grantRead(glueJobRoleL1);

		// L1 Construct: CfnJobの作成
		// より低レベルな実装で、AWS CloudFormationに近い形式
		new glueL1.CfnJob(this, "SamplePythonShellJobL1", {
			name: `${props.projectName}-${props.envName}-sample-job-l1`,
			role: glueJobRoleL1.roleArn,
			description: "Sample Python Shell Job (L1)",
			glueVersion: "3.0",
			// コマンド設定
			command: {
				name: "pythonshell",
				pythonVersion: "3.9",
				scriptLocation: `s3://${scriptBucket.bucketName}/scripts/etl_script.py`,
			},
			maxCapacity: 0.0625,
			// 同時実行数の設定
			executionProperty: {
				maxConcurrentRuns: 1,
			},
			// ジョブ実行時の引数設定
			defaultArguments: {
				"--env": props.envName,
				"--project": props.projectName,
				// L2と同様にcontinuousLoggingを有効化
				"--enable-continuous-cloudwatch-log": "true",
				"--enable-metrics": "",
			},
			timeout: 30,
			maxRetries: 2,
		});

		// ===== L2 Construct による実装 =====
		// L2用のIAMロール作成
		const glueJobRoleL2 = new iam.Role(this, "GlueJobRoleL2", {
			roleName: `${props.projectName}-${props.envName}-etl-glue-l2-execution-role`,
			assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSGlueServiceRole",
				),
			],
		});
		// CloudWatchLogsへのアクセス権限を明示的に設定
		glueJobRoleL2.addToPolicy(
			new iam.PolicyStatement({
				resources: ["arn:aws:logs:*:*:*:/aws-glue/*"],
				actions: [
					"logs:CreateLogGroup",
					"logs:CreateLogStream",
					"logs:PutLogEvents",
				],
			}),
		);
		// S3バケットへの読み取り権限を付与
		scriptBucket.grantRead(glueJobRoleL2);

		// L2 Construct: PythonShellJobの作成
		// より高レベルな抽象化を提供し、設定がシンプル
		new gluel2.PythonShellJob(this, "SamplePythonShellJobL2", {
			jobName: `${props.projectName}-${props.envName}-sample-job-l2`,
			role: glueJobRoleL2,
			description: "Sample Python Shell Job (L2)",
			glueVersion: gluel2.GlueVersion.V3_0,
			pythonVersion: gluel2.PythonVersion.THREE_NINE,
			script: gluel2.Code.fromBucket(scriptBucket, "scripts/etl_script.py"),
			maxCapacity: gluel2.MaxCapacity.DPU_1_16TH,
			defaultArguments: {
				"--env": props.envName,
				"--project": props.projectName,
			},
			timeout: cdk.Duration.minutes(30),
			continuousLogging: { enabled: true },
			maxRetries: 2,
		});
	}
}
