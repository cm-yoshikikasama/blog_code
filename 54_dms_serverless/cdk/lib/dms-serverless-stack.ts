import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as dms from "aws-cdk-lib/aws-dms";
import * as events from "aws-cdk-lib/aws-events";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
// import * as ssm from "aws-cdk-lib/aws-ssm";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface DmsServerlessStackStackProps extends cdk.StackProps {
	envName: string;
	projectName: string;
}

export class DmsServerlessStack extends cdk.Stack {
	constructor(
		scope: Construct,
		id: string,
		props: DmsServerlessStackStackProps,
	) {
		super(scope, id, props);

		const targetBucket = s3.Bucket.fromBucketName(
			this,
			"TargetBucket",
			"cm-kasama-dms-test",
		);

		const vpc = ec2.Vpc.fromLookup(this, "ExistingVpc", {
			vpcId: "vpc-id",
		});

		// DMSセキュリティグループの作成
		const dmsSecurityGroup = new ec2.SecurityGroup(this, "DmsSecurityGroup", {
			vpc,
			securityGroupName: "cm-kasama-dms-sg",
			description: "Security group for DMS replication instance",
			allowAllOutbound: false, // アウトバウンドルールを明示的に定義するため
		});

		// RDSへのアウトバウンドルール（MySQL/Aurora）
		dmsSecurityGroup.addEgressRule(
			ec2.Peer.ipv4("10.0.0.0/16"),
			ec2.Port.tcp(3306),
			"To RDS",
		);

		// S3へのアウトバウンドルール（HTTPS）
		dmsSecurityGroup.addEgressRule(
			ec2.Peer.prefixList("pl-61a54008"),
			ec2.Port.tcp(443),
			"Allow traffic to S3",
		);

		// 既存のサブネットを参照
		const subnets = [
			ec2.Subnet.fromSubnetId(this, "Subnet1", "subnet-id"),
			ec2.Subnet.fromSubnetId(this, "Subnet2", "subnet-id"),
		];
		// DMSサブネットグループの作成
		const dmsSubnetGroup = new dms.CfnReplicationSubnetGroup(
			this,
			"DmsSubnetGroup",
			{
				replicationSubnetGroupDescription: "Subnet group for DMS replication",
				replicationSubnetGroupIdentifier: "cm-kasama-dms-subnet-group",
				subnetIds: subnets.map((subnet) => subnet.subnetId),
			},
		);
		// DMS用のIAMロールを作成
		const dmsRole = new iam.Role(this, "DmsS3Role", {
			roleName: "cm-kasama-dms-test",
			assumedBy: new iam.ServicePrincipal("dms.amazonaws.com"),
			description: "IAM role for DMS to access S3 bucket",
		});

		// S3バケットへのアクセス権限を付与
		dmsRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: [
					"s3:PutObject",
					"s3:DeleteObject",
					"s3:ListBucket",
					"s3:GetBucketLocation",
					"s3:PutObjectTagging",
				],
				resources: [
					`arn:aws:s3:::${targetBucket.bucketName}`,
					`arn:aws:s3:::${targetBucket.bucketName}/*`,
				],
			}),
		);

		// KMSへのアクセス権限を付与
		dmsRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: [
					"kms:ListAliases",
					"kms:DescribeKey",
					"kms:Encrypt",
					"kms:Decrypt",
					"kms:ReEncrypt*",
					"kms:GenerateDataKey*",
				],
				resources: ["*"],
			}),
		);

		// EC2リソースへのアクセス権限を付与
		dmsRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: [
					"ec2:DescribeVpcs",
					"ec2:DescribeInternetGateways",
					"ec2:DescribeAvailabilityZones",
					"ec2:DescribeSubnets",
					"ec2:DescribeSecurityGroups",
					"ec2:ModifyNetworkInterfaceAttribute",
					"ec2:CreateNetworkInterface",
					"ec2:DeleteNetworkInterface",
				],
				resources: ["*"],
			}),
		);

		// RDSリソースへのアクセス権限を付与
		dmsRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: ["rds:DescribeDBInstances", "rds:DescribeDBClusters"],
				resources: ["*"],
			}),
		);

		const dbSecret = secretsmanager.Secret.fromSecretAttributes(
			this,
			"DbSecret",
			{
				secretCompleteArn: `arn:aws:secretsmanager:${this.region}:${this.account}:secret:cm-kasama-rds-secret-manager-9BA88J`,
			},
		);

		const rdsSourceEndpoint = new dms.CfnEndpoint(this, "RdsSourceEndpoint", {
			endpointType: "source",
			engineName: "mysql",
			endpointIdentifier: "cm-kasama-rds-endpoint-test",

			// RDS サーバー接続情報
			serverName: "rds-arn",
			port: 3306,
			username: "admin",
			password: dbSecret.secretValueFromJson("password").unsafeUnwrap(),

			// SSL 設定
			sslMode: "none",

			// MySQL 固有の設定
			mySqlSettings: {
				eventsPollInterval: 5,
			},
		});

		// S3ターゲットエンドポイントの作成
		const s3TargetEndpoint = new dms.CfnEndpoint(this, "S3TargetEndpoint", {
			endpointType: "target",
			engineName: "s3",
			endpointIdentifier: "cm-kasama-s3-endpoint-test",

			// S3固有の設定
			s3Settings: {
				bucketName: "cm-kasama-dms-test",
				serviceAccessRoleArn: dmsRole.roleArn,

				// Parquet形式の設定
				dataFormat: "parquet",
				parquetVersion: "parquet-2-0",
				enableStatistics: true,

				// 圧縮設定
				compressionType: "GZIP",

				// 日付パーティション設定
				datePartitionEnabled: true,
				datePartitionSequence: "YYYYMMDD",
				datePartitionDelimiter: "SLASH",

				timestampColumnName: "dms_created_at",
			},
		});

		const dmsReplicationConfig = new dms.CfnReplicationConfig(
			this,
			"DMSReplicationConfig",
			{
				replicationSettings: {
					Logging: {
						EnableLogging: true,
						LogConfiguration: {
							TraceOnErrorMb: 10,
							EnableTraceOnError: false,
						},
						EnableLogContext: false,
					},
					PreMigrationAssessment: {
						Enable: false,
					},
				},
				resourceIdentifier: "cm-kasama-dms-replication",
				replicationConfigIdentifier: "cm-kasama-dms-replication",
				computeConfig: {
					minCapacityUnits: 1,
					multiAz: false,
					vpcSecurityGroupIds: [dmsSecurityGroup.securityGroupId],
					maxCapacityUnits: 16,
					replicationSubnetGroupId:
						dmsSubnetGroup.replicationSubnetGroupIdentifier,
				},
				replicationType: "full-load-and-cdc",
				tableMappings: {
					rules: [
						{
							"rule-id": "1",
							"rule-action": "include",
							"rule-type": "selection",
							"object-locator": {
								"schema-name": "sample_db",
								"table-name": "product_reviews",
							},
							"rule-name": "Include product_reviews table",
						},
						{
							"rule-id": "2",
							"rule-action": "include",
							"rule-type": "selection",
							"object-locator": {
								"schema-name": "sample_db",
								"table-name": "products",
							},
							"rule-name": "Include products table",
						},
					],
				},
				sourceEndpointArn: rdsSourceEndpoint.ref,
				targetEndpointArn: s3TargetEndpoint.ref,
			},
		);

		// レプリケーション設定がエンドポイント作成後に行われるように依存関係を設定
		dmsReplicationConfig.addDependency(rdsSourceEndpoint);
		dmsReplicationConfig.addDependency(s3TargetEndpoint);
		dmsReplicationConfig.addDependency(dmsSubnetGroup);

		// 既存のSNSトピックを参照
		const errorNotificationTopic = sns.Topic.fromTopicArn(
			this,
			"ErrorNotificationTopic",
			`arn:aws:sns:${this.region}:${this.account}:cm-kasama-dms-error-topic`,
		);

		// EventBridge Scheduler用のIAMロールを作成
		const schedulerRole = new iam.Role(this, "DmsEventSchedulerRole", {
			roleName: "cm-kasama-dms-event-scheduler-test",
			assumedBy: new iam.CompositePrincipal(
				new iam.ServicePrincipal("scheduler.amazonaws.com"),
				new iam.ServicePrincipal("events.amazonaws.com"),
			),
			description:
				"IAM role for EventBridge Scheduler to start/stop DMS replication",
		});
		schedulerRole.addToPolicy(
			// DMSレプリケーションの開始と停止権限を付与
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: ["dms:StartReplication", "dms:StopReplication"],
				resources: [dmsReplicationConfig.attrReplicationConfigArn],
			}),
		);

		schedulerRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: ["sns:Publish"],
				resources: [errorNotificationTopic.topicArn],
			}),
		);
		// DMS開始スケジューラー
		new scheduler.CfnSchedule(this, "DmsStartSchedule", {
			name: "cm-kasama-dms-start-test",
			description: "Schedule to start DMS replication",
			flexibleTimeWindow: {
				mode: "OFF",
			},
			// スケジュールは可変
			scheduleExpression: "cron(0 1 * * ? *)",
			scheduleExpressionTimezone: "Asia/Tokyo",
			target: {
				arn: "arn:aws:scheduler:::aws-sdk:databasemigration:startReplication",
				roleArn: schedulerRole.roleArn,
				input: JSON.stringify({
					ReplicationConfigArn: dmsReplicationConfig.attrReplicationConfigArn,
					StartReplicationType: "resume-processing",
				}),
			},
			state: "ENABLED",
			groupName: "default",
		});

		// DMS停止スケジューラー
		new scheduler.CfnSchedule(this, "DmsStopSchedule", {
			name: "cm-kasama-dms-stop-test",
			description: "Schedule to stop DMS replication",
			flexibleTimeWindow: {
				mode: "OFF",
			},
			// スケジュールは可変
			scheduleExpression: "cron(0 2 * * ? *)",
			scheduleExpressionTimezone: "Asia/Tokyo",
			target: {
				arn: "arn:aws:scheduler:::aws-sdk:databasemigration:stopReplication",
				roleArn: schedulerRole.roleArn,
				input: JSON.stringify({
					ReplicationConfigArn: dmsReplicationConfig.attrReplicationConfigArn,
				}),
			},
			state: "ENABLED",
			groupName: "default",
		});

		new events.CfnRule(this, "DmsFailureRule", {
			name: "cm-kasama-event-rule-dms-failure-test",
			description:
				"Rule to detect when DMS replication fails and send notification",
			eventPattern: {
				source: ["aws.dms"],
				"detail-type": ["DMS Replication State Change"],
				detail: {
					eventType: ["REPLICATION_FAILED"],
				},
				resources: [dmsReplicationConfig.attrReplicationConfigArn],
			},
			state: "ENABLED",
			targets: [
				{
					id: "DMSFailureNotification",
					arn: errorNotificationTopic.topicArn,
					roleArn: schedulerRole.roleArn,
					input: JSON.stringify({
						source: "custom",
						content: {
							description: `DMS replication failed for configuration: ${dmsReplicationConfig.attrReplicationConfigArn}. Please check the AWS DMS console for more details.`,
						},
					}),
				},
			],
		});
	}
}
