# 32_windows_server_of_cfn

## 構築手順

### EC2 キーペア作成

AWS Management ConsoleからEC2のキーペアを作成します。

### Windows インスタンスの構築

AWS Management ConsoleからCloudFomration画面へ遷移し、
以下ymlファイルをtemplateとしてWindows EC2インスタンスを構築します。

- windows_ec2.yml: ec2作成

- Parameters:
  - Prefix: cm-kasama
  - AZ1: デフォルト値を使用
  - LatestWindowsAmiId: デフォルト値を使用
  - KeyName: 作成したEC2キーペア名

### IAM Role作成

cloudwatch alarmで活用するeventbridge, step functions用のIAM Roleを
CloudFormationから作成します。

- health_resource_check_role.yml

### SNS TOPIC作成

CloudWatch Alarmで最終的な通知手段として活用するSNS TOPICを
CloudFormationから作成します。

- health_resource_check_sns.yml


### CloudWatch Agent Install

```shell
aws ssm send-command \
 --document-name "AWS-ConfigureAWSPackage" \
 --document-version "1" \
 --targets Key=InstanceIds,Values="<INSTANCE_ID>" \
 --parameters action=Install,installationType="Uninstall and reinstall",name=AmazonCloudWatchAgent,version=latest \
 --timeout-seconds 600 --max-concurrency "50" --max-errors "0" --region ap-northeast-1

```

### CloudWatch Agent Configure

```shell
aws ssm send-command --document-name "AmazonCloudWatch-ManageAgent" \
 --document-version "6" \
 --targets '[{"Key":"InstanceIds","Values":["<INSTANCE_ID>"]}]' \
 --parameters '{"action":["configure"],"mode":["ec2"],"optionalConfigurationSource":["ssm"],"optionalConfigurationLocation":["AmazonCloudWatch-windows-ec2-cm-kasama"],"optionalOpenTelemetryCollectorConfigurationSource":["ssm"],"optionalOpenTelemetryCollectorConfigurationLocation":[""],"optionalRestart":["yes"]}' \
 --timeout-seconds 600 --max-concurrency "50" --max-errors "0" --region ap-northeast-1
```

### CloudWatch Alarm構築

最後にCloudWatch Alarmとそれに紐づいて活用するEvent Bridge, Step Functionsを
CloudFormationから作成します。

- health_resource_check_alarm.yml

- Parameters:
  - CloudWatchAlarmResourceNotificationTopicARN arn:aws:sns:ap-northeast-1:<AWS_ACCOUNT_ID>:CloudWatchAlarmResourceNotificationTopic
  - InstanceId	<INSTANCE_ID>
  - InstanceType <INSTANCE_TYPE>
  - SNSPublishRoleARN	arn:aws:iam::<AWS_ACCOUNT_ID>:role/SNSPublishFromStateMachineRole
  - StatemachineExecRoleARN: arn:aws:iam::<AWS_ACCOUNT_ID>:role/EventBridgeToStateMachineExecutionRole
