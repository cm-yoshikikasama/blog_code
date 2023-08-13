# シェルスクリプトからlambdaを実行する処理テスト

## Deploy方法

### 前提条件

- Node.js 14系 のインストール
- AWS CLIでAWS環境にアクセスできるようになっていること

### 修正点

- run_lambda.sh:
  - regionとprofileはそれぞれ任意の設定が必要です。
- serverless.yml:
  - region任意の地域の設定が必要です。

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
cd 23_shell_script_with_json_escape
AWS_SDK_LOAD_CONFIG=true AWS_PROFILE={AWS環境にアクセスするProfile}  sls deploy
```