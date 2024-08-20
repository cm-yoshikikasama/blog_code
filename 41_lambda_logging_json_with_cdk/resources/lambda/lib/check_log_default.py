import logging

logger = logging.getLogger()


def check_log_test():
    logger.debug("debug")
    logger.info("info")
    logger.error("error")
    logger.critical("critical")
