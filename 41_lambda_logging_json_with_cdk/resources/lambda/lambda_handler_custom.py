import json
from lib.get_logger import get_logger

logger = get_logger()


def lambda_handler(event, context):
    # 各ログレベルでメッセージを出力
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    logger.critical("This is a critical message")

    # エラーをシミュレート
    try:
        1 / 0
    except ZeroDivisionError:
        logger.exception("An exception occurred")

    return {
        "statusCode": 200,
        "body": json.dumps("Logging configuration inspected and tested!"),
    }
