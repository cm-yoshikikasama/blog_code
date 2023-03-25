import os
import logging, logging.handlers


class DebugFilter(logging.Filter):
    def filter(self, record):
        return record.levelno == logging.DEBUG


class InfoFilter(logging.Filter):
    def filter(self, record):
        return record.levelno == logging.INFO


class MyLogger:
    def __init__(self, name):
        self._make_log_dir()
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)

        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(name)s - %(funcName)s  - line:%(lineno)d - %(message)s"
        )

        debug_file_path = "log/debug.log"
        debug_handler = logging.handlers.RotatingFileHandler(
            filename=debug_file_path, encoding="utf-8", maxBytes=100, backupCount=5
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_handler.setFormatter(formatter)
        debug_filter = DebugFilter()
        debug_handler.addFilter(debug_filter)
        self.logger.addHandler(debug_handler)

        info_file_path = "log/info.log"
        info_handler = logging.handlers.RotatingFileHandler(
            filename=info_file_path, encoding="utf-8", maxBytes=100, backupCount=5
        )
        info_handler.setLevel(logging.INFO)
        info_handler.setFormatter(formatter)
        info_filter = InfoFilter()
        info_handler.addFilter(info_filter)
        self.logger.addHandler(info_handler)

        error_file_path = "log/error.log"
        error_handler = logging.handlers.RotatingFileHandler(
            filename=error_file_path, encoding="utf-8", maxBytes=100, backupCount=5
        )
        error_handler.setLevel(logging.WARNING)
        error_handler.setFormatter(formatter)
        self.logger.addHandler(error_handler)

        # /**コンソール出力設定例
        # import sys
        # console_handler = logging.StreamHandler(sys.stdout)
        # console_handler.setLevel(logging.INFO)
        # console_handler.setFormatter(formatter)
        # info_filter = InfoFilter()
        # console_handler.addFilter(info_filter)
        # self.logger.addHandler(console_handler)

        # error_handler = logging.StreamHandler(sys.stderr)
        # error_handler.setLevel(logging.WARNING)
        # error_handler.setFormatter(formatter)
        # self.logger.addHandler(error_handler)
        # **/

    def _make_log_dir(self):
        LOG_DIR = "log"

        if not os.path.exists(LOG_DIR):
            # ディレクトリが存在しない場合、ディレクトリを作成する
            os.makedirs(LOG_DIR)
