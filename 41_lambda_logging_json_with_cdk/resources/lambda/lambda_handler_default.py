import logging
import json
from lib.check_log import check_log_test

logger = logging.getLogger()


def lambda_handler(event, context):
    # 各ログレベルでテストメッセージを出力
    logging.debug("This is a debug message")
    logging.info("This is an info message")
    logging.warning("This is a warning message")
    logging.error("This is an error message")
    logging.critical("This is a critical message")

    # エラーをシミュレートしてスタックトレースを表示
    try:
        1 / 0
    except ZeroDivisionError:
        logging.exception("An exception occurred")

    check_log_test()

    return {
        "statusCode": 200,
        "body": json.dumps("Logging configuration inspected and tested!"),
    }
