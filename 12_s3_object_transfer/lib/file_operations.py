import csv


def get_csv_file(bucket_name, prefix, s3_client):
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
