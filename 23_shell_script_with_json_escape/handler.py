from aws_lambda_powertools.utilities.typing import LambdaContext


def handler(event, context: LambdaContext):
    # イベントデータをログに出力
    response = {"statusCode": 200, "body": event}

    return response
