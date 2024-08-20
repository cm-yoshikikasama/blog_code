from lib.get_logger import setup_logger

logger = setup_logger()


def check_log_test():
    logger.debug("debug")
    logger.info("info")
    logger.error("error")
    logger.critical("critical")
