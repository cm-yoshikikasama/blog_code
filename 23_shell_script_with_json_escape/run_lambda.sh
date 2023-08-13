#!/bin/bash
# AWS CLIを使用してLambda関数を実行するシェルスクリプト


function run_lambda () {
  aws lambda invoke \
  --region "<lambda-region>" \
  --function-name shell-script-with-json-escape-handler \
  --payload '{"param_1": "'"$1"'", "params": {"param_2": "'"$2"'"}}' \
  --profile "<your-iam-role>" \
  --cli-binary-format raw-in-base64-out response.json
  if [ $? -ne 0 ]; then
    echo "shell-script-with-json-escape-handlerの実行に失敗しました。"
  fi
}

echo "**********START**********"

output="output: python Error: Expecting value: line 1 column 1 (char 0)

"

escaped_output=$(printf "%q" "$output")
# output_without_newline="${output//$'\n'/}"

echo "$escaped_output"

run_lambda "AAA" "$escaped_output"
# 実行結果の表示
cat response.json

# 一時ファイルの削除
rm response.json
