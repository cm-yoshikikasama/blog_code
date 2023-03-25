from lib.my_logger import MyLogger
from lib.actions import test

my_logger = MyLogger(__name__)
logger = my_logger.logger


def main():

    logger.debug("debug")
    logger.info("info")
    logger.error("error")
    test()


if __name__ == "__main__":
    main()
