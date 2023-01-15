# RedshiftへのSELECT文を実行

## 主な機能

- API GatewayをトリガーとしてLambdaを実行し、Redshiftの対象tableのデータを参照

## Deploy方法

### 前提条件

- Node.js 14系 のインストール
- AWS CLIでAWS環境にアクセスできるようになっていること

### Serverless インストール

```text
npm install -g serverless
```

※ slsのバージョンが変わると使用できなくなる可能性があるため、エラーが出た場合はバージョンも確認が必要。

### Serverless pluginインストール

```text
sls plugin install -n serverless-python-requirements
sudo npm install serverless-aws-response-schema-plugin
```

### デプロイ

```text
$ AWS_SDK_LOAD_CONFIG=true AWS_PROFILE=${AWS環境にアクセスするProfile}  sls deploy
```
