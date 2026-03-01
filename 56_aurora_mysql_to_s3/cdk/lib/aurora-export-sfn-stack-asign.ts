import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import type { Construct } from 'constructs';

export class AuroraExportSfnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 固定値をconstで定義
    const crossAccountRoleArn =
      'arn:aws:iam::<AccountId>:role/cm-kasama-cross-account-sfn-export-trigger-role';
    const rdsExportServiceRoleArn =
      'arn:aws:iam::<AccountId>:role/cm-kasama-rds-export-service-role';
    const exportKmsKeyId = `arn:aws:kms:ap-northeast-1:${cdk.Stack.of(this).account}:alias/cm-kasama-aurora-export-kms-key`;
    const exportBucketName = 'cm-kasama-rds-export-bucket';
    const sfnExecutionRoleArn = `arn:aws:iam::${cdk.Stack.of(this).account}:role/cm-kasama-export-aurora-sfn-role`;
    const rdsClusterArn =
      'arn:aws:rds:ap-northeast-1:<AccountId>:cluster:cm-kasama-aurora-mysql-cluster';

    // --- 本来のリソース・ステート定義（コメントアウトで残す） ---
    // クロスアカウント用Role
    const crossAccountRole = iam.Role.fromRoleArn(this, 'CrossAccountRole', crossAccountRoleArn);
    const crossAccountTaskRole = sfn.TaskRole.fromRole(crossAccountRole);
    const credentials = { role: crossAccountTaskRole };

    // 1. S3削除
    const listForDelete = new tasks.CallAwsService(this, 'ListForDelete', {
      service: 's3',
      action: 'listObjectsV2',
      parameters: {
        Bucket: exportBucketName,
        Prefix: 'cm-kasama/your-export-folder/', // 削除したいprefixに変更
        MaxKeys: 1000,
      },
      resultPath: '$.deleteObjects',
      iamResources: [`arn:aws:s3:::${exportBucketName}`, `arn:aws:s3:::${exportBucketName}/*`],
    });
    const mapDelete = new sfn.Map(this, 'DeleteAllObjects', {
      itemsPath: '$.deleteObjects.Contents',
      resultPath: sfn.JsonPath.DISCARD,
      itemSelector: {
        'Key.$': '$$.Map.Item.Value.Key',
      },
    });
    mapDelete.itemProcessor(
      new tasks.CallAwsService(this, 'DeleteObject', {
        service: 's3',
        action: 'deleteObject',
        parameters: {
          Bucket: exportBucketName,
          Key: sfn.JsonPath.stringAt('$.Key'),
        },
        resultPath: sfn.JsonPath.DISCARD,
        // 必要なIAMリソース
        iamResources: [`arn:aws:s3:::${exportBucketName}`, `arn:aws:s3:::${exportBucketName}/*`],
      })
    );

    // 2. RDSエクスポート
    const assignExportTaskId = new sfn.Pass(this, 'AssignExportTaskId', {
      assign: {
        'exportTaskId.$': '$.ExportTaskIdentifier',
      },
    });
    const startExportTask = new tasks.CallAwsService(this, 'StartExportTask', {
      service: 'rds',
      action: 'startExportTask',
      parameters: {
        ExportTaskIdentifier: sfn.JsonPath.stringAt('$exportTaskId'),
        SourceArn: rdsClusterArn,
        S3BucketName: exportBucketName,
        IamRoleArn: rdsExportServiceRoleArn,
        KmsKeyId: exportKmsKeyId,
        S3Prefix: 'cm-kasama',
        ExportOnly: ['sample_db.products'],
      },
      iamResources: [rdsClusterArn],
      credentials,
    });
    const waitForExport = new sfn.Wait(this, 'WaitForExport', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
    });
    const checkExportStatus = new tasks.CallAwsService(this, 'CheckExportStatus', {
      service: 'rds',
      action: 'describeExportTasks',
      parameters: {
        ExportTaskIdentifier: sfn.JsonPath.stringAt('$exportTaskId'),
      },
      iamResources: [rdsClusterArn],
      credentials,
    });
    const success = new sfn.Succeed(this, 'Success');
    const fail = new sfn.Fail(this, 'Fail', {
      error: 'ExportFailed',
      cause: 'The export task failed.',
    });

    // 3. S3移動
    const listForMove = new tasks.CallAwsService(this, 'ListForMove', {
      service: 's3',
      action: 'listObjectsV2',
      parameters: {
        Bucket: exportBucketName,
        Prefix: sfn.JsonPath.format(
          'cm-kasama/{}/sample_db/sample_db.products/',
          sfn.JsonPath.stringAt('$.exportTaskId')
        ),
        MaxKeys: 1000,
      },
      resultPath: '$.moveObjects',
      iamResources: [`arn:aws:s3:::${exportBucketName}`, `arn:aws:s3:::${exportBucketName}/*`],
    });
    const mapMove = new sfn.Map(this, 'MoveAllObjects', {
      itemsPath: '$.moveObjects.Contents',
      resultPath: sfn.JsonPath.DISCARD,
      itemSelector: {
        'Key.$': '$$.Map.Item.Value.Key',
      },
    });
    mapMove.itemProcessor(
      new tasks.CallAwsService(this, 'CopyObject', {
        service: 's3',
        action: 'copyObject',
        parameters: {
          Bucket: exportBucketName,
          CopySource: sfn.JsonPath.format(
            '{}/{}',
            exportBucketName,
            sfn.JsonPath.stringAt('$.Key')
          ),
          Key: sfn.JsonPath.format('cm-kasama/fixed-path/{}', sfn.JsonPath.stringAt('$.Key')),
        },
        resultPath: sfn.JsonPath.DISCARD,
        // 必要なIAMリソース
        iamResources: [`arn:aws:s3:::${exportBucketName}`, `arn:aws:s3:::${exportBucketName}/*`],
      })
    );
    const successWithMove = listForMove.next(mapMove).next(success);
    const isExportComplete = new sfn.Choice(this, 'IsExportComplete');
    isExportComplete
      .when(sfn.Condition.stringEquals('$.ExportTasks[0].Status', 'COMPLETE'), successWithMove)
      .when(sfn.Condition.stringEquals('$.ExportTasks[0].Status', 'FAILED'), fail)
      .otherwise(waitForExport);

    // ステートマシン定義
    const definition = listForDelete
      .next(mapDelete)
      .next(assignExportTaskId)
      .next(startExportTask)
      .next(waitForExport)
      .next(checkExportStatus)
      .next(isExportComplete);

    new sfn.StateMachine(this, 'ExportSnapshotStateMachine', {
      stateMachineName: 'cm-kasama-export-aurora-sfn-cdk',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role: iam.Role.fromRoleArn(this, 'SfnExecutionRole', sfnExecutionRoleArn),
    });
  }
}
