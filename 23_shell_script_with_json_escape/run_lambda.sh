#!/bin/bash
# AWS CLIを使用してLambda関数を実行するシェルスクリプト


function run_lambda () {
  aws lambda invoke \
  --region "hoge" \
  --function-name shell-script-with-json-escape-handler \
  --payload '{"param_1": "'"$1"'", "params": {"param_2": "'"$2"'"}}' \
  --profile "<your-iam-role>" \
  --cli-binary-format raw-in-base64-out response.json
  if [ $? -ne 0 ]; then
    echo "shell-script-with-json-escape-handlerの実行に失敗しました。"
  fi
}

echo "**********START**********"

output="ほげoutput: python Error: Expecting value: line 1 column 1 (char 0)

"

output_with_newline=$(echo "$output" | sed 's/$/\\n/' | tr -d '\n')

echo "$output_with_newline"

run_lambda "AAA" "$output_with_newline"


# 実行結果の表示
cat response.json

# 一時ファイルの削除
rm response.json