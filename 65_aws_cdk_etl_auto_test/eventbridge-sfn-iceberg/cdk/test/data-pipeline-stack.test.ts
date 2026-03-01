import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataPipelineStack } from '../lib/data-pipeline-stack';
import { devParameter } from '../lib/parameter';

const app = new cdk.App();
const stack = new DataPipelineStack(app, 'TestStack', {
  env: { account: '123456789012', region: 'ap-northeast-1' },
  appParameter: {
    ...devParameter,
    env: { account: '123456789012', region: 'ap-northeast-1' },
  },
});
const template = Template.fromStack(stack);

describe('DataPipelineStack', () => {
  test('snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('creates expected resource counts', () => {
    // 3 Lambdas: ProcessAndLoad + BucketDeployment handler + AutoDeleteObjects handler
    template.resourceCountIs('AWS::Lambda::Function', 3);
    template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    template.resourceCountIs('AWS::S3::Bucket', 2);
    // 2 Layers: DuckDB + BucketDeployment AWS CLI layer
    template.resourceCountIs('AWS::Lambda::LayerVersion', 2);
  });

  test('Lambda has Python 3.13 runtime and ARM64 architecture', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
      Architectures: ['arm64'],
    });
  });

  test('S3 buckets have encryption enabled', () => {
    template.allResourcesProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          }),
        ]),
      },
    });
  });

  test('EventBridge rule has correct schedule expression', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(0 9 * * ? *)',
    });
  });
});
