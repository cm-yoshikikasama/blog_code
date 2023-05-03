# CFN実行コマンド

## aws cloudformationでstackをデプロイするシェルスクリプト

- 以下のブログでも記載の通りdeployコマンドを使用してCloudFormation stackの作成、更新を実施します。
  - <https://dev.classmethod.jp/articles/aws-all-iac/>

- cm_kasama_restrict_role.yaml

```text
aws cloudformation deploy --stack-name cm-kasama-restrict-role-dev --template-file ./cm_kasama_restrict_role.yaml --no-execute-changeset --profile <roleを作成するアカウントのprofile> --parameter-overrides Env=dev --capabilities CAPABILITY_NAMED_IAM
```

- cm_kasama_restrict_s3.yaml

```text
aws cloudformation deploy --stack-name cm-kasama-restrict-s3-dev --template-file ./cm_kasama_restrict_s3.yaml --no-execute-changeset --profile ${S3 Bucketを作成するアカウントのprofile} --parameter-overrides Env=dev

```

- cm_kasama_iam_user_groups.yaml

```text
aws cloudformation deploy --stack-name cm-kasama-iam-user-groups-dev --template-file ./cm_kasama_iam_user_groups.yaml --no-execute-changeset --profile <roleを作成するアカウントのprofile> --capabilities CAPABILITY_NAMED_IAM
```
