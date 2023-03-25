from lib.my_logger import MyLogger

my_logger = MyLogger(__name__)
logger = my_logger.logger


def test():
    logger.debug("debug")
    logger.info("info")
    logger.error("error")
