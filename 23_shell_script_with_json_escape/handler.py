import json
from aws_lambda_powertools.utilities.typing import LambdaContext


def handler(event, context: LambdaContext):
    # イベントデータをログに出力
    print("Received event:", json.dumps(event, indent=2))

    # レスポンスの準備
    response = {"statusCode": 200, "body": json.dumps("Hello from Lambda!")}

    return response
