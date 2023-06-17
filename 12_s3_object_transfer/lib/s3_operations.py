from aws_lambda_powertools import Logger

logger = Logger()

def s3_objects_existence(csv_to_file_names, target_bucket_name, target_prefix, s3_client):
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
