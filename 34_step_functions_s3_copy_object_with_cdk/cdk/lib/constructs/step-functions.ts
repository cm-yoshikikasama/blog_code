import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfn_tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
// import * as cdk from "aws-cdk-lib";
import { Construct } from 'constructs';

export interface StepFunctionsConstructProps {
  envName: string;
  projectName: string;
  dataSourceBucketName: string;
  dataStoreBucketName: string;
}

export class StepFunctionsConstruct extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  constructor(scope: Construct, id: string, props: StepFunctionsConstructProps) {
    super(scope, id);

    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      description: 'An IAM role for Step Functions to access AWS services',
      roleName: `StepFunctionsExecutionRoleForS3Copy-${props.envName}`,
    });

    stepFunctionsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:CopyObject'],
        resources: [
          `arn:aws:s3:::${props.dataSourceBucketName}`,
          `arn:aws:s3:::${props.dataSourceBucketName}/*`,
          `arn:aws:s3:::${props.dataStoreBucketName}`,
          `arn:aws:s3:::${props.dataStoreBucketName}/*`,
        ],
      })
    );

    const listObjectsV2 = new sfn_tasks.CallAwsService(this, 'ListObjectsV2', {
      service: 's3',
      action: 'listObjectsV2',
      parameters: { Bucket: props.dataSourceBucketName, Prefix: 'src/' },
      iamResources: [`arn:aws:s3:::${props.dataSourceBucketName}/src/*`],
      resultPath: '$.listResult',
    });

    const filterObjects = new sfn.Pass(this, 'FilterObjects', {
      parameters: {
        'FilteredContents.$': '$.listResult.Contents[?(@.Size > 0)]',
      },
      resultPath: '$.listFilteredResult',
    });

    const copyObjectMap = new sfn.Map(this, 'CopyObjectsMap', {
      maxConcurrency: 1000,
      itemsPath: '$.listFilteredResult.FilteredContents',
      itemSelector: {
        'FileName.$':
          "States.ArrayGetItem(States.StringSplit($$.Map.Item.Value.Key, '/'), States.MathAdd(States.ArrayLength(States.StringSplit($$.Map.Item.Value.Key, '/')), -1))",
        'Key.$': '$$.Map.Item.Value.Key',
      },
    });
    const copyObject = new sfn_tasks.CallAwsService(this, 'CopyObject', {
      service: 's3',
      action: 'copyObject',
      parameters: {
        Bucket: props.dataStoreBucketName,
        CopySource: sfn.JsonPath.stringAt(
          `States.Format('${props.dataSourceBucketName}/{}', $.Key)`
        ),
        Key: sfn.JsonPath.stringAt("States.Format('target/{}', $.FileName)"),
      },
      iamResources: [`arn:aws:s3:::${props.dataStoreBucketName}/target/*`],
      resultPath: sfn.JsonPath.DISCARD,
    });
    copyObjectMap.itemProcessor(copyObject);

    const definitionBody = sfn.DefinitionBody.fromChainable(
      listObjectsV2.next(filterObjects).next(copyObjectMap)
    );
    this.stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      stateMachineName: `${props.projectName}-${props.envName}-CSVProcessorStateMachine`,
      definitionBody: definitionBody,
      role: stepFunctionsRole,
    });
  }
}
