import boto3
import csv
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()

s3_client = boto3.client("s3")


def get_csv_file(bucket_name, prefix):
    """
    S3バケットから指定したプレフィックスのCSVファイルを取得する

    :param bucket_name: str : バケット名
    :param prefix: str : 検索するプレフィックス
    :return: str : CSVファイルの中身
    """
    response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
    for obj in response.get("Contents"):
        key = obj.get("Key")
        # CSVファイルかどうかチェック
        if key.startswith(prefix) and key.endswith(".csv"):
            csv_file = key
            break
    response = s3_client.get_object(Bucket=bucket_name, Key=csv_file)
    content = response["Body"].read().decode("utf-8")
    return content


def get_file_names_from_csv(csv_content, file_name_colum):
    """
    CSVファイルの中身からファイル名を取得する

    :param csv_content: str : CSVファイルの中身
    :return: list : ファイル名のリスト
    """
    csv_to_file_names = []
    rows = csv.reader(csv_content.splitlines())
    header = next(rows)  # ヘッダーをスキップ
    file_name_colum_num = header.index(file_name_colum)
    for row in rows:
        csv_to_file_names.append(row[file_name_colum_num])
    return csv_to_file_names


def s3_objects_existence(csv_to_file_names, target_bucket_name, target_prefix):
    """
    S3バケット上にファイルが存在するか確認する

    :param csv_to_file_names: list : ファイル名のリスト
    :param target_bucket_name: str : バケット名
    :param target_prefix: str : target格納先のprefix
    :return: dict : ファイルの存在状態
    """
    for file_name in csv_to_file_names:
        try:

            s3_client.head_object(Bucket=target_bucket_name, Key=target_prefix + file_name)
            logger.info(f"{target_prefix}{file_name} exists.")
        except Exception as e:
            logger.info(f"{target_prefix}{file_name} does not exists.")
            logger.info(e)


@logger.inject_lambda_context(log_event=True)
def handler(event, context: LambdaContext):
    """
    Lambdaハンドラ関数

    :param event: dict : Lambdaのイベントオブジェクト
    :param context: dict : Lambdaのコンテキストオブジェクト
    """
    csv_bucket_name = "<source_bucket>"
    target_bucket_name = "<target_bucket>"
    csv_prefix = "csv_list/"
    target_prefix = "target/files/"
    file_name_colum = "csv_file_name"
    csv_content = get_csv_file(csv_bucket_name, csv_prefix)
    csv_to_file_names = get_file_names_from_csv(csv_content, file_name_colum)
    logger.info(csv_to_file_names)
    s3_objects_existence(csv_to_file_names, target_bucket_name, target_prefix)
