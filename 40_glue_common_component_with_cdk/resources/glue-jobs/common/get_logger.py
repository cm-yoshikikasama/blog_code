import logging
import sys


def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    log_format = "[%(levelname)s][%(filename)s][%(funcName)s:%(lineno)d]\t%(message)s"
    formatter = logging.Formatter(log_format)

    stdout_handler = logging.StreamHandler(stream=sys.stdout)
    stdout_handler.setFormatter(formatter)
    logger.addHandler(stdout_handler)

    return logger
