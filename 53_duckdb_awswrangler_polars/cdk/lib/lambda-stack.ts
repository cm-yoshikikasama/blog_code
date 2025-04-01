import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as gluel2 from "@aws-cdk/aws-glue-alpha";
import * as path from "path";
import { PythonLayerVersion } from "@aws-cdk/aws-lambda-python-alpha";

export interface LambdaStackProps extends cdk.StackProps {
	envName: string;
	projectName: string;
}

export class LambdaStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: LambdaStackProps) {
		super(scope, id, props);

		const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSLambdaBasicExecutionRole",
				),
				iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
			],
		});

		const awswranglerLambdaName = `${props.projectName}-${props.envName}-awswrangler-handler`;
		const duckdbLambdaName = `${props.projectName}-${props.envName}-duckdb-handler`;
		const polarsLambdaName = `${props.projectName}-${props.envName}-polars-handler`;
		const source_bucket = "<your_s3_bucket>";
		const filename = "large_sample";
		const source_key = `src/${filename}.csv`;
		const destination_bucket = "<your_s3_bucket>";
		const destination_key = `target/${filename}/${filename}.parquet`;

		const duckdbLayer = new PythonLayerVersion(this, "DuckdbLayer", {
			entry: path.join(__dirname, "../layers/duckdb"),
			compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
			compatibleArchitectures: [lambda.Architecture.ARM_64],
			description: "Layer containing DuckDB",
			layerVersionName: `${props.projectName}-${props.envName}-duckdb-layer`,
			bundling: {
				assetHashType: cdk.AssetHashType.SOURCE,
				outputPathSuffix: "python",
			},
		});

		const polarsLayer = new PythonLayerVersion(this, "PolarsLayer", {
			entry: path.join(__dirname, "../layers/polars"),
			compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
			compatibleArchitectures: [lambda.Architecture.ARM_64],
			description: "Layer containing Polars",
			layerVersionName: `${props.projectName}-${props.envName}-polars-layer`,
			bundling: {
				assetHashType: cdk.AssetHashType.SOURCE,
				outputPathSuffix: "python",
			},
		});

		new lambda.Function(this, "AwswranglerLambda", {
			functionName: awswranglerLambdaName,
			runtime: lambda.Runtime.PYTHON_3_13,
			code: lambda.Code.fromAsset("../resources/lambda"),
			handler: "aws_wrangler_test.lambda_handler",
			memorySize: 10240,
			ephemeralStorageSize: cdk.Size.gibibytes(10),
			timeout: cdk.Duration.seconds(900),
			role: lambdaRole,
			layers: [
				lambda.LayerVersion.fromLayerVersionArn(
					this,
					"AwsSdkPandasLayer",
					"arn:aws:lambda:ap-northeast-1:336392948345:layer:AWSSDKPandas-Python313-Arm64:1",
				),
			],
			environment: {
				source_bucket: source_bucket,
				source_key: source_key,
				destination_bucket: destination_bucket,
				destination_key: destination_key,
			},
			architecture: lambda.Architecture.ARM_64,
		});

		new lambda.Function(this, "DuckdbLambda", {
			functionName: duckdbLambdaName,
			runtime: lambda.Runtime.PYTHON_3_13,
			code: lambda.Code.fromAsset("../resources/lambda"),
			handler: "duckdb_test.lambda_handler",
			memorySize: 10240,
			ephemeralStorageSize: cdk.Size.gibibytes(10),
			timeout: cdk.Duration.seconds(900),
			role: lambdaRole,
			layers: [duckdbLayer],
			environment: {
				source_bucket: source_bucket,
				source_key: source_key,
				destination_bucket: destination_bucket,
				destination_key: destination_key,
			},
			architecture: lambda.Architecture.ARM_64,
		});

		new lambda.Function(this, "polarsLambda", {
			functionName: polarsLambdaName,
			runtime: lambda.Runtime.PYTHON_3_13,
			code: lambda.Code.fromAsset("../resources/lambda"),
			handler: "polars_test.lambda_handler",
			memorySize: 10240,
			ephemeralStorageSize: cdk.Size.gibibytes(10),
			timeout: cdk.Duration.seconds(900),
			role: lambdaRole,
			layers: [polarsLayer],
			environment: {
				source_bucket: source_bucket,
				source_key: source_key,
				destination_bucket: destination_bucket,
				destination_key: destination_key,
			},
			architecture: lambda.Architecture.ARM_64,
		});

		// ===== Glueでサンプルデータ作成する設定 =====

		// ===== 共通のS3バケット設定 =====
		const scriptBucket = new s3.Bucket(this, "ScriptBucket", {
			bucketName: `${props.projectName}-${props.envName}-scripts-${this.account}-${this.region}`,
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

		// L2用のIAMロール作成
		const glueJobRoleL2 = new iam.Role(this, "GlueJobRoleL2", {
			roleName: `${props.projectName}-${props.envName}-etl-glue-l2-execution-role`,
			assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSGlueServiceRole",
				),
				iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
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

		new gluel2.PythonShellJob(this, "SamplePythonShellJobL2", {
			jobName: `${props.projectName}-${props.envName}-sample-job-l2`,
			role: glueJobRoleL2,
			description: "Sample Python Shell Job (L2)",
			glueVersion: gluel2.GlueVersion.V3_0,
			pythonVersion: gluel2.PythonVersion.THREE_NINE,
			script: gluel2.Code.fromBucket(
				scriptBucket,
				"scripts/create_duckdb_csv.py",
			),
			maxCapacity: gluel2.MaxCapacity.DPU_1,
			defaultArguments: {
				"--env": props.envName,
				"--project": props.projectName,
				"--file_bucket": source_bucket,
				"--file_key": "src/bigdata_sample.csv",
				"--total_raws": "1000000",
				"--additional-python-modules": "duckdb",
			},
			timeout: cdk.Duration.minutes(30),
			continuousLogging: { enabled: true },
		});
	}
}
