# S3 file checkを実行

## 主な機能

- S3に格納されたcsvのpdfファイル名が格納されたカラムとS3の特定のpathにpdfが存在するかチェック

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
```

### デプロイ

```text
AWS_SDK_LOAD_CONFIG=true AWS_PROFILE=${AWS環境にアクセスするProfile}  sls deploy
```

## Pytest実行手順

```
cd 12_5_lambda_s3_file_check
export PYTHONPATH=$(pwd)
pytest

```