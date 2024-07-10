import sys
import pkgutil
import boto3
import traceback


def print_importable_modules():
    print("--- Importable Python Modules ---")
    for module in pkgutil.iter_modules():
        print(module.name)


print_importable_modules()

from data_processing import process_data, get_current_time, read_csv_from_s3, write_csv_to_s3
from get_logger import setup_logging
from awsglue.utils import getResolvedOptions

logger = setup_logging()


def main():
    try:

        args = getResolvedOptions(
            sys.argv,
            [
                "S3_INPUT_BUCKET",
                "S3_INPUT_KEY",
                "S3_OUTPUT_BUCKET",
                "S3_OUTPUT_KEY_PREFIX",
            ],
        )
        s3_input_bucket = args["S3_INPUT_BUCKET"]
        s3_input_key = args["S3_INPUT_KEY"]
        s3_output_bucket = args["S3_OUTPUT_BUCKET"]
        s3_output_key = args["S3_OUTPUT_KEY_PREFIX"]
        logger.info(f"Reading input data from s3://{s3_input_bucket}/{s3_input_key}")

        s3_client = boto3.client("s3")

        input_data = read_csv_from_s3(s3_client, s3_input_bucket, s3_input_key)

        logger.info("Processing data...")
        processed_data = process_data(input_data)

        current_time = get_current_time().strftime("%Y-%m-%d-%H-%M-%S")
        output_filename = f"{s3_output_key}output_{current_time}.csv"

        logger.info(f"Writing processed data to s3://{s3_output_bucket}/{output_filename}")
        write_csv_to_s3(s3_client, processed_data, s3_output_bucket, output_filename)

        logger.info("ETL process completed successfully")

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        raise e


if __name__ == "__main__":
    main()
