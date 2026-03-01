import * as cdk from 'aws-cdk-lib';
import * as lakeformation from 'aws-cdk-lib/aws-lakeformation';
import type { Construct } from 'constructs';

export interface LakeFormationHybridStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}

export class LakeFormationHybridStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LakeFormationHybridStackProps) {
    super(scope, id, props);

    // 既存リソースを定数として定義
    const existingResources = {
      dataBucketNameArn: `arn:aws:s3:::${props.projectName}-lakeformation-tests`,
      lakeFormationAdminRoleArn: `arn:aws:iam::${this.account}:role/${props.projectName}-lakeformation-admin`,
      lakeFormationAccessRoleArn: `arn:aws:iam::${this.account}:role/${props.projectName}-data-access-role`,
      databaseName: 'cm_kasama_hr_employee',
      tableName: 'personal_info',
      sensitiveColumns: ['salary'], // 機密情報を含む列
    };

    // Lake Formation 管理ロール設定
    new lakeformation.CfnDataLakeSettings(this, 'DataLakeSettings', {
      admins: [
        {
          dataLakePrincipalIdentifier: existingResources.lakeFormationAdminRoleArn,
        },
      ],
      allowExternalDataFiltering: false, // 外部データフィルタリング
    });
    // Data lake locationsにS3バケットを登録
    new lakeformation.CfnResource(this, 'RegisterS3Location', {
      resourceArn: existingResources.dataBucketNameArn,
      useServiceLinkedRole: true, // サービスリンクロールを使用
      hybridAccessEnabled: true,
    });

    // LFタグの作成
    new lakeformation.CfnTag(this, 'AccessLevelTag', {
      catalogId: this.account,
      tagKey: 'AccessLevel',
      tagValues: ['Open', 'Restricted'],
    });

    // LFタグの付与
    // table全体にOpenタグを割り当てる
    new lakeformation.CfnTagAssociation(this, 'TableOpenTagAssociation', {
      lfTags: [
        {
          catalogId: this.account,
          tagKey: 'AccessLevel',
          tagValues: ['Open'],
        },
      ],
      resource: {
        table: {
          catalogId: this.account,
          databaseName: existingResources.databaseName,
          name: existingResources.tableName,
        },
      },
    });

    // LFタグの付与
    // 機密列のみにRestrictedタグを割り当てる
    new lakeformation.CfnTagAssociation(this, 'RestrictedColumnsTagAssociation', {
      lfTags: [
        {
          catalogId: this.account,
          tagKey: 'AccessLevel',
          tagValues: ['Restricted'],
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
    });

    // LF-Tagに基づいたアクセス権限の付与
    new lakeformation.CfnPrincipalPermissions(this, 'TagBasedPermissions', {
      catalog: this.account,
      principal: {
        dataLakePrincipalIdentifier: existingResources.lakeFormationAccessRoleArn,
      },
      resource: {
        lfTagPolicy: {
          catalogId: this.account,
          resourceType: 'TABLE',
          expression: [
            {
              tagKey: 'AccessLevel',
              tagValues: ['Open'],
            },
          ],
        },
      },
      permissions: ['SELECT', 'DESCRIBE'],
      permissionsWithGrantOption: [],
    });
  }
}
