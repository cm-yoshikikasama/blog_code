import { resolve } from "node:path";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
	BlockPublicAccess,
	Bucket,
	BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export interface ETLStackProps extends cdk.StackProps {
	envName: string;
	projectName: string;
}

export class ETLStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: ETLStackProps) {
		super(scope, id, props);

		// S3バケットの作成
		const dataStoreBucket = new Bucket(this, "DataStoreBucket", {
			bucketName: `${props.projectName}-${props.envName}-data-store`,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			encryption: BucketEncryption.KMS_MANAGED,
			versioned: true,
		});

		// Lambda用のIAMロールを作成
		const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSLambdaBasicExecutionRole",
				),
			],
		});

		// Lambda関数の作成
		const lambdaName = `${props.projectName}-${props.envName}-etl-handler`;
		new lambda.Function(this, "EtlHandler", {
			functionName: lambdaName,
			runtime: lambda.Runtime.PROVIDED_AL2023,
			architecture: lambda.Architecture.ARM_64,
			code: lambda.Code.fromAsset(resolve("../resources/lambda/"), {
				assetHashType: cdk.AssetHashType.OUTPUT,
				bundling: this.getLambdaBundlingOption(),
			}),
			handler: "etl_handler.main",
			memorySize: 512,
			timeout: cdk.Duration.seconds(900),
			role: lambdaRole,
			environment: {
				S3_OUTPUT_BUCKET: dataStoreBucket.bucketName,
				S3_OUTPUT_KEY_PREFIX: "output/",
			},
		});

		// S3アクセス用のポリシーをLambdaロールに追加
		lambdaRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: ["s3:ListBucket", "s3:GetObject", "s3:PutObject"],
				resources: [
					`arn:aws:s3:::${dataStoreBucket.bucketName}`,
					`arn:aws:s3:::${dataStoreBucket.bucketName}/*`,
				],
			}),
		);
	}

	private getLambdaBundlingOption(): cdk.BundlingOptions {
		return {
			image: cdk.DockerImage.fromRegistry("golang:1.21.1-alpine"),
			command: [
				"sh",
				"-c",
				`CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o /asset-output/bootstrap`,
			],
			user: "root",
			volumes: [
				{
					hostPath: "cdk-go-mod",
					containerPath: "/go/pkg/mod",
				},
				{
					hostPath: "cdk-go-build",
					containerPath: "/root/.cache/go-build",
				},
			],
		};
	}
}
