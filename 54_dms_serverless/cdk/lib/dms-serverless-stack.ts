import * as cdk from 'aws-cdk-lib';
import * as dms from 'aws-cdk-lib/aws-dms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

export interface DmsServerlessStackStackProps extends cdk.StackProps {
  envName: string;
  projectName: string;
}
// デプロイ前に指定が必要な値はここでまとめて管理
const SUBNET_IDS = [
  'subnet-xxxxxxxxxxxxxxxxx', // 1つ目のDMSサブネットID
  'subnet-yyyyyyyyyyyyyyyyy', // 2つ目のDMSサブネットID
];
const S3_BUCKET_NAME = 'S3-Bucket-Name'; // DMSターゲット用S3バケット名
const SECRET_ARN = 'arn:aws:secretsmanager:ap-northeast-1:xxxxxxxxxxxx:secret:ID'; // DMSアカウントのRDSシークレットのARN
const DMS_SECURITY_GROUP_PREFIX_LIST_ID = 'pl-'; // S3 VPCエンドポイントのPrefixListId
const RDS_SERVER_NAME = 'rds-arn'; // RDSのエンドポイント名

export class DmsServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DmsServerlessStackStackProps) {
    super(scope, id, props);

    const targetBucket = s3.Bucket.fromBucketName(this, 'TargetBucket', S3_BUCKET_NAME);

    const vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', {
      vpcName: 'cm-kasama-bastion-vpc',
    });

    // DMSセキュリティグループの作成
    const dmsSecurityGroup = new ec2.SecurityGroup(this, 'DmsSecurityGroup', {
      vpc,
      securityGroupName: 'cm-kasama-dms-sg',
      description: 'Security group for DMS replication instance',
      allowAllOutbound: false, // アウトバウンドルールを明示的に定義するため
    });

    // RDSへのアウトバウンドルール（MySQL/Aurora）
    dmsSecurityGroup.addEgressRule(ec2.Peer.ipv4('172.16.0.0/16'), ec2.Port.tcp(3306), 'To RDS');

    // S3へのアウトバウンドルール（HTTPS）
    dmsSecurityGroup.addEgressRule(
      ec2.Peer.prefixList(DMS_SECURITY_GROUP_PREFIX_LIST_ID),
      ec2.Port.tcp(443),
      'Allow traffic to S3'
    );

    // 既存のサブネットを参照
    const subnets = [
      ec2.Subnet.fromSubnetId(this, 'Subnet1', SUBNET_IDS[0]),
      ec2.Subnet.fromSubnetId(this, 'Subnet2', SUBNET_IDS[1]),
    ];
    // DMSサブネットグループの作成
    const dmsSubnetGroup = new dms.CfnReplicationSubnetGroup(this, 'DmsSubnetGroup', {
      replicationSubnetGroupDescription: 'Subnet group for DMS replication',
      replicationSubnetGroupIdentifier: 'cm-kasama-dms-subnet-group',
      subnetIds: subnets.map((subnet) => subnet.subnetId),
    });
    // DMS用のIAMロールを作成
    const dmsRole = new iam.Role(this, 'DmsS3Role', {
      roleName: 'cm-kasama-dms-test',
      assumedBy: new iam.ServicePrincipal('dms.amazonaws.com'),
      description: 'IAM role for DMS to access S3 bucket',
    });

    // S3バケットへのアクセス権限を付与
    dmsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
          's3:GetBucketLocation',
          's3:PutObjectTagging',
        ],
        resources: [
          `arn:aws:s3:::${targetBucket.bucketName}`,
          `arn:aws:s3:::${targetBucket.bucketName}/*`,
        ],
      })
    );

    // KMSへのアクセス権限を付与
    dmsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'kms:ListAliases',
          'kms:DescribeKey',
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey*',
        ],
        resources: ['*'],
      })
    );

    // EC2リソースへのアクセス権限を付与
    dmsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ec2:DescribeVpcs',
          'ec2:DescribeInternetGateways',
          'ec2:DescribeAvailabilityZones',
          'ec2:DescribeSubnets',
          'ec2:DescribeSecurityGroups',
          'ec2:ModifyNetworkInterfaceAttribute',
          'ec2:CreateNetworkInterface',
          'ec2:DeleteNetworkInterface',
        ],
        resources: ['*'],
      })
    );

    // RDSリソースへのアクセス権限を付与
    dmsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['rds:DescribeDBInstances', 'rds:DescribeDBClusters'],
        resources: ['*'],
      })
    );

    const dbSecret = secretsmanager.Secret.fromSecretAttributes(this, 'DbSecret', {
      secretCompleteArn: SECRET_ARN,
    });

    const rdsSourceEndpoint = new dms.CfnEndpoint(this, 'RdsSourceEndpoint', {
      endpointType: 'source',
      engineName: 'mysql',
      endpointIdentifier: 'cm-kasama-rds-endpoint-test',

      // RDS サーバー接続情報
      serverName: RDS_SERVER_NAME,
      port: 3306,
      username: 'admin',
      password: dbSecret.secretValueFromJson('password').unsafeUnwrap(),

      // SSL 設定
      sslMode: 'none',

      // MySQL 固有の設定
      mySqlSettings: {
        eventsPollInterval: 5,
      },
    });

    // S3ターゲットエンドポイントの作成
    const s3TargetEndpoint = new dms.CfnEndpoint(this, 'S3TargetEndpoint', {
      endpointType: 'target',
      engineName: 's3',
      endpointIdentifier: 'cm-kasama-s3-endpoint-test',

      // S3固有の設定
      s3Settings: {
        bucketName: S3_BUCKET_NAME,
        serviceAccessRoleArn: dmsRole.roleArn,

        // Parquet形式の設定
        dataFormat: 'parquet',
        parquetVersion: 'parquet-2-0',
        enableStatistics: true,

        // 圧縮設定
        compressionType: 'GZIP',

        // 日付パーティション設定
        datePartitionEnabled: true,
        datePartitionSequence: 'YYYYMMDD',
        datePartitionDelimiter: 'SLASH',

        timestampColumnName: 'dms_created_at',
      },
    });

    const dmsReplicationConfig = new dms.CfnReplicationConfig(this, 'DMSReplicationConfig', {
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
      resourceIdentifier: 'cm-kasama-dms-replication',
      replicationConfigIdentifier: 'cm-kasama-dms-replication',
      computeConfig: {
        minCapacityUnits: 1,
        multiAz: false,
        vpcSecurityGroupIds: [dmsSecurityGroup.securityGroupId],
        maxCapacityUnits: 4,
        replicationSubnetGroupId: dmsSubnetGroup.replicationSubnetGroupIdentifier,
      },
      replicationType: 'full-load-and-cdc',
      tableMappings: {
        rules: [
          {
            'rule-id': '1',
            'rule-action': 'include',
            'rule-type': 'selection',
            'object-locator': {
              'schema-name': 'sample_db',
              'table-name': 'product_reviews',
            },
            'rule-name': 'Include product_reviews table',
          },
          {
            'rule-id': '2',
            'rule-action': 'include',
            'rule-type': 'selection',
            'object-locator': {
              'schema-name': 'sample_db',
              'table-name': 'products',
            },
            'rule-name': 'Include products table',
          },
        ],
      },
      sourceEndpointArn: rdsSourceEndpoint.ref,
      targetEndpointArn: s3TargetEndpoint.ref,
    });

    // レプリケーション設定がエンドポイント作成後に行われるように依存関係を設定
    dmsReplicationConfig.addDependency(rdsSourceEndpoint);
    dmsReplicationConfig.addDependency(s3TargetEndpoint);
    dmsReplicationConfig.addDependency(dmsSubnetGroup);
  }
}
