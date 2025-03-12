import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lakeformation from "aws-cdk-lib/aws-lakeformation";
import type { Construct } from "constructs";

export interface LakeFormationHybridStackProps extends cdk.StackProps {
	envName: string;
	projectName: string;
}

export class LakeFormationHybridStack extends cdk.Stack {
	constructor(
		scope: Construct,
		id: string,
		props: LakeFormationHybridStackProps,
	) {
		super(scope, id, props);

		// 既存リソースを定数として定義
		const existingResources = {
			dataBucketName: `${props.projectName}-lakeformation-tests`,
			lakeFormationAdminRoleArn: `arn:aws:iam::${this.account}:role/${props.projectName}-lakeformation-admin`,
			lakeFormationAccessRoleArn: `arn:aws:iam::${this.account}:role/${props.projectName}-hr-data-access-with-lakeformation`,
			databaseName: "cm_kasama_hr_employee",
			tableName: "personal_info",
			sensitiveColumns: ["salary"], // 機密情報を含む列
		};

		// 既存のS3バケットを参照
		const dataBucket = s3.Bucket.fromBucketName(
			this,
			"ExistingDataLakeBucket",
			existingResources.dataBucketName,
		);

		// 既存のIAMロールを参照
		const lakeFormationAdminRole = iam.Role.fromRoleArn(
			this,
			"LakeFormationAdminRole",
			existingResources.lakeFormationAdminRoleArn,
		);

		const lakeFormationAccessRole = iam.Role.fromRoleArn(
			this,
			"LakeFormationAccessRole",
			existingResources.lakeFormationAccessRoleArn,
		);

		// Lake Formation 管理ロール設定
		new lakeformation.CfnDataLakeSettings(this, "DataLakeSettings", {
			admins: [
				{
					dataLakePrincipalIdentifier: lakeFormationAdminRole.roleArn,
				},
			],
			allowExternalDataFiltering: true, // 外部データフィルタリングを許可
			externalDataFilteringAllowList: [
				{
					dataLakePrincipalIdentifier: this.account,
				},
			],
		});
		// Data lake locationsにS3バケットを登録
		new lakeformation.CfnResource(this, "RegisterS3Location", {
			resourceArn: dataBucket.bucketArn,
			useServiceLinkedRole: true, // サービスリンクロールを使用
			hybridAccessEnabled: true,
		});

		// LFタグの作成
		new lakeformation.CfnTag(this, "AccessLevelTag", {
			catalogId: this.account,
			tagKey: "AccessLevel",
			tagValues: ["Open", "Restricted"],
		});

		// LFタグの付与
		// データベース全体にOpenタグを割り当てる
		new lakeformation.CfnTagAssociation(this, "DatabaseOpenTagAssociation", {
			lfTags: [
				{
					catalogId: this.account,
					tagKey: "AccessLevel",
					tagValues: ["Open"],
				},
			],
			resource: {
				database: {
					catalogId: this.account,
					name: existingResources.databaseName,
				},
			},
		});

		// LFタグの付与
		// 機密列のみにRestrictedタグを割り当てる
		new lakeformation.CfnTagAssociation(
			this,
			"RestrictedColumnsTagAssociation",
			{
				lfTags: [
					{
						catalogId: this.account,
						tagKey: "AccessLevel",
						tagValues: ["Restricted"],
					},
				],
				resource: {
					tableWithColumns: {
						catalogId: this.account,
						databaseName: existingResources.databaseName,
						name: existingResources.tableName,
						columnNames: existingResources.sensitiveColumns, // 機密列のみ指定
					},
				},
			},
		);

		// LF-Tagに基づいたアクセス権限の付与
		new lakeformation.CfnPrincipalPermissions(this, "TagBasedPermissions", {
			catalog: this.account,
			principal: {
				dataLakePrincipalIdentifier: lakeFormationAccessRole.roleArn,
			},
			resource: {
				lfTagPolicy: {
					catalogId: this.account,
					resourceType: "TABLE",
					expression: [
						{
							tagKey: "AccessLevel",
							tagValues: ["Open"],
						},
					],
				},
			},
			permissions: ["SELECT", "DESCRIBE"],
			permissionsWithGrantOption: [],
		});
	}
}
