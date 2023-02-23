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


def get_pdf_file_names_from_csv(csv_content, pdf_name_colum_num):
    """
    CSVファイルの中身からファイル名を取得する

    :param csv_content: str : CSVファイルの中身
    :return: list : ファイル名のリスト
    """
    csv_to_file_names = []
    rows = csv.reader(csv_content.splitlines())
    next(rows)  # ヘッダーをスキップ
    for row in rows:
        csv_to_file_names.append(row[pdf_name_colum_num])
    return csv_to_file_names


def check_pdf_objects_existence(file_names, bucket_name, pdf_prefix):
    """
    S3バケット上にファイルが存在するか確認する

    :param file_names: list : ファイル名のリスト
    :param bucket_name: str : バケット名
    :param pdf_prefix: str : pdf格納先のprefix
    :return: dict : ファイルの存在状態
    """
    result = {}
    response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=pdf_prefix)
    for obj in response.get("Contents"):
        key = obj.get("Key")
        # PDFファイルかどうかチェック
        if key.startswith(pdf_prefix) and key.endswith(".pdf"):
            file_name = key.replace(pdf_prefix, "")
            logger.info(file_names)
            logger.info(file_name)
            if file_name in file_names:
                result[file_name] = True
    for file_name in file_names:
        if file_name not in result:
            result[file_name] = False
    return result


# def check_pdf_objects_existence(file_names, bucket_name, pdf_prefix):
#     """
#     S3バケット上にファイルが存在するか確認する

#     :param file_names: list : ファイル名のリスト
#     :param bucket_name: str : バケット名
#     :param pdf_prefix: str : pdf格納先のprefix
#     :return: dict : ファイルの存在状態
#     """
#     result = {}
#     for file_name in file_names:
#         try:
#             s3_client.head_object(Bucket=bucket_name, Key=pdf_prefix + file_name)
#             result[file_name] = True
#         except:
#             result[file_name] = False
#     return result


def log_result(result):
    """
    ログにファイルの存在状態を出力する

    :param result: dict : ファイルの存在状態
    """
    for file_name, exists in result.items():
        if exists:
            logger.info(f"{file_name} exists.")
        else:
            logger.info(f"{file_name} does not exist.")


@logger.inject_lambda_context(log_event=True)
def handler(event, context: LambdaContext):
    """
    Lambdaハンドラ関数

    :param event: dict : Lambdaのイベントオブジェクト
    :param context: dict : Lambdaのコンテキストオブジェクト
    """
    csv_bucket_name = "<your csv bucket>"
    pdf_bucket_name = "<your pdf bucekt>"
    csv_prefix = "csv_list/"
    pdf_prefix = "pdfs/"
    pdf_name_colum_num = 0
    csv_content = get_csv_file(csv_bucket_name, csv_prefix)
    csv_to_file_names = get_pdf_file_names_from_csv(csv_content, pdf_name_colum_num)
    logger.info(csv_to_file_names)
    result = check_pdf_objects_existence(csv_to_file_names, pdf_bucket_name, pdf_prefix)
    log_result(result)
