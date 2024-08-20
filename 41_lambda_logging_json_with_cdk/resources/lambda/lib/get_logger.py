import logging
import json
import traceback


class CustomJsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "requestId": getattr(record, "aws_request_id", None),
            "funcName": record.funcName,
            "lineno": record.lineno,
        }
        if record.exc_info:
            log_entry.update(
                {
                    "stackTrace": traceback.format_exception(*record.exc_info),
                    "errorType": record.exc_info[0].__name__,
                    "errorMessage": str(record.exc_info[1]),
                    "location": f"{record.pathname}:{record.funcName}:{record.lineno}",
                }
            )
        return json.dumps(log_entry)


def setup_logger():
    logger = logging.getLogger()
    # Lambdaのデフォルトハンドラーを取得し、カスタムフォーマッターを適用
    handler = logger.handlers[0]
    handler.setFormatter(CustomJsonFormatter())
    return logger
