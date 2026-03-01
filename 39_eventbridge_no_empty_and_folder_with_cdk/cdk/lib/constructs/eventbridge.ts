import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface EventBridgeConstructProps {
  envName: string;
  projectName: string;
  dataSourceBucketName: string;
  lambdaFunctionArn: string;
}

export class EventBridgeConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EventBridgeConstructProps) {
    super(scope, id);

    // Lambda 関数の参照を先に行う
    const lambdaFunction = lambda.Function.fromFunctionAttributes(this, 'ImportedLambdaFunction', {
      functionArn: props.lambdaFunctionArn,
      sameEnvironment: true,
    });

    // EventBridge が Lambda を呼び出すための IAM ロールを作成
    const eventBridgeRole = new iam.Role(this, 'EventBridgeInvokeLambdaRole', {
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      roleName: `${props.projectName}-${props.envName}-eventbridge-invoke-lambda-role`,
      description: 'IAM role for EventBridge to invoke Lambda function',
    });

    // Lambda 関数を呼び出す権限をロールに付与
    lambdaFunction.grantInvoke(eventBridgeRole);

    const s3PutRule = new events.Rule(this, 'S3PutRule', {
      description: `Triggers Lambda function when a file is uploaded to the ${props.dataSourceBucketName} bucket`,
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [props.dataSourceBucketName],
          },
          object: {
            key: [
              {
                prefix: 'input/test-',
              },
              {
                suffix: '.csv',
              },
            ],
            // key: [
            //   {
            //     wildcard: "input/test-*.csv",
            //   },
            // ],
            size: [{ numeric: ['>', 0] }],
          },
        },
      },
      ruleName: `${props.projectName}-${props.envName}-s3-put-rule`,
    });

    s3PutRule.addTarget(new eventsTargets.LambdaFunction(lambdaFunction, {}));
  }
}
