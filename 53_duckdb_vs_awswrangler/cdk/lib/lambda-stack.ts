import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
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
		const source_bucket = "<your_source_bucket>";
		const filename = "medium_sample";
		const source_key = `src/${filename}.csv`;
		const destination_bucket = "<your_destination_bucket>";
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
	}
}
