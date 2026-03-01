import os

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from lib.file_operations import get_csv_file, get_file_names_from_csv
from lib.s3_operations import s3_objects_existence

logger = Logger()

s3_client = boto3.client("s3")


@logger.inject_lambda_context(log_event=True)
def handler(event, context: LambdaContext):
    """
    Lambdaハンドラ関数

    :param event: dict : Lambdaのイベントオブジェクト
    :param context: dict : Lambdaのコンテキストオブジェクト
    """
    ENV = os.getenv("ENV")

    csv_bucket_name = f"cm-kasama-{ENV}-restrict"
    target_bucket_name = "cm-kasama-infa"
    csv_prefix = "csv_list/"
    target_prefix = "target/files/"
    file_name_colum = "csv_file_name"
    csv_content = get_csv_file(csv_bucket_name, csv_prefix, s3_client)
    csv_to_file_names = get_file_names_from_csv(csv_content, file_name_colum)
    logger.info(csv_to_file_names)
    s3_objects_existence(
        csv_to_file_names, target_bucket_name, target_prefix, s3_client
    )
