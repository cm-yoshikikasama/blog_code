from lib.actions import test
from lib.my_logger import MyLogger

my_logger = MyLogger(__name__)
logger = my_logger.logger


def main():
    logger.debug("debug")
    logger.info("info")
    logger.error("error")
    logger.critical("critical")
    test()


if __name__ == "__main__":
    main()
