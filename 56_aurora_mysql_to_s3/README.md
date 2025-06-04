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
    - 一時的に BucketPolicy をコメントアウトして作成
  - analytics_account_kms.yml
    - 一時的に KMS key のポリシーをコメントアウトして作成
  - analytics_account_iam.yml
    - 一時的に policy をコメントアウトして作成
  - aurora_account_iam.yml
  - analytics_account_s3.yml
    - コメントアウトを戻して更新
  - analytics_account_kms.yml
    - コメントアウトを戻して更新
  - analytics_account_iam.yml
    - コメントアウトを戻して更新
  - analytics_account_sfn.yml
