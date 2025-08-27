# 56_aurora_mysql_to_s3

```txt
aws rds start-export-task \
    --export-task-identifier cm-kasama-cluster-export \
    --source-arn <DB_CLUSTER_ARN> \
    --s3-bucket-name <DATA_BUCKET_ARN \
    --iam-role-arn <IAM_ROLE_ARN \
    --kms-key-id <CMK_ARN>
```

- part_1 デプロイ手順
  - analytics_account_s3.yml
    - パラメータを false にして作成
  - aurora_account_iam.yml
    - kms key arn は dummy
    - useIam は false
  - CDK で kms key, sfn role をデプロイ
  - analytics_account_s3.yml
    - パラメータを true にして作成
    - iam role arn は作成された role の arn を指定
  - analytics_account_iam.yml
    - kms key arn は CDK でデプロイしたものを指定
    - sfn role arn は CDK でデプロイしたものを指定
    - useIam は true
