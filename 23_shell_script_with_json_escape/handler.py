import json
from aws_lambda_powertools.utilities.typing import LambdaContext


def handler(event, context: LambdaContext):
    # イベントデータをログに出力
    print("Received event:", json.dumps(event, indent=2))
    # unescaped_string = bytes(event['params']['param_2'], "utf-8").decode("unicode_escape")
    # print(unescaped_string)
    # レスポンスの準備
    response = {"statusCode": 200, "body": json.dumps(event["params"])}

    return response
