import sys
import logging


class GetLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)

        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(name)s - %(funcName)s  - line:%(lineno)d - %(message)s"
        )

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)

        warning_handler = logging.StreamHandler(sys.stderr)
        warning_handler.setLevel(logging.WARNING)
        warning_handler.setFormatter(formatter)

        self.logger.addHandler(console_handler)
        self.logger.addHandler(warning_handler)
