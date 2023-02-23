# CFN実行コマンド

## aws cliでIAMを実行する場合

- 例
  - <https://qiita.com/sakai00kou/items/5a7ebb0898ea3eab7239#%E5%A4%89%E6%9B%B4%E3%82%BB%E3%83%83%E3%83%88%E3%81%AE%E4%BD%9C%E6%88%90>
  - <https://blog.serverworks.co.jp/cloudformation-parameter-management>
- stackをcreateする場合

``` text
 aws cloudformation create-stack --template-body file://s3_same_region_replication_role.yml --stack-name dev-s3-same-region-replication-role --parameters ParameterKey=Env,ParameterValue=dev --capabilities CAPABILITY_NAMED_IAM --profile infa-role
```

``` text
 aws cloudformation create-stack --template-body file://S3.yml --stack-name dev-s3 --parameters ParameterKey=Env,ParameterValue=dev --capabilities CAPABILITY_NAMED_IAM --profile infa-role
```

- 変更セットを作成する場合

```text
aws cloudformation create-change-set --change-set-name revised-role-change-set --template-body file://gplm_same_region_replication_role.yml --stack-name dev-s3-same-region-replication-role --parameters ParameterKey=Env,ParameterValue=dev --capabilities CAPABILITY_NAMED_IAM --profile gplm-role
```

```text
aws cloudformation create-change-set --change-set-name dev-s3-change --template-body file://S3.yml --stack-name dev-s3 --parameters ParameterKey=Env,ParameterValue=dev --profile infa-role
```
