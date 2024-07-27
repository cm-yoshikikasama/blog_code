import os
import boto3
import logging


class GetLogger:
    def __init__(self, name):

        log_level = "DEBUG"
        print("log_level:", log_level)
        self.logger = logging.getLogger(name)
        self.logger.setLevel(log_level)
        self.logger.propagate = False  # propagateを設定
        formatter = logging.Formatter("%(levelname)s - %(name)s - %(funcName)s - line:%(lineno)d - %(message)s")
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
