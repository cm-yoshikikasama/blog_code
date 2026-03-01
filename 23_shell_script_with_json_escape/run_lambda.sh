#!/bin/bash
# AWS CLIを使用してLambda関数を実行するシェルスクリプト

function run_lambda () {
  payload=$(jq -n --arg p1 "$1" --arg p2 "$2" '{param_1: $p1, params: {param_2: $p2}}')
  aws lambda invoke \
  --region "<lambda-region>" \
  --function-name shell-script-with-json-escape-handler \
  --payload "$payload" \
  --profile "<your-iam-role>" \
  --cli-binary-format raw-in-base64-out response.json

  if [ $? -ne 0 ]; then
    echo "shell-script-with-json-escape-handlerの実行に失敗しました。"
    exit 1
  fi
}

echo "**********START**********"

output="output: python Error: Expecting value: line 1 column 1 (char 0)


"

run_lambda "AAA" "$output"

# 実行結果の表示
cat response.json

# 一時ファイルの削除
rm response.json
