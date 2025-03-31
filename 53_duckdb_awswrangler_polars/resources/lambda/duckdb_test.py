import os
import time
import json
import boto3
import duckdb


def lambda_handler(event, context):
    start_time = time.time()

    # S3バケット情報を取得
    source_bucket = os.environ.get("source_bucket")
    source_key = os.environ.get("source_key")
    destination_bucket = os.environ.get("destination_bucket")
    destination_key = os.environ.get("destination_key")

    source_path = f"s3://{source_bucket}/{source_key}"
    destination_path = f"s3://{destination_bucket}/{destination_key}"

    s3 = boto3.client("s3")

    # 一時ファイルのパス
    temp_input = "/tmp/input.csv"
    temp_output = "/tmp/output.parquet"

    try:
        # 処理開始をログ出力
        print(f"処理開始: {source_key}")

        # S3からCSVファイルをダウンロード
        s3.download_file(source_bucket, source_key, temp_input)

        # DuckDBを使用してCSVをParquetに変換
        con = duckdb.connect(database=":memory:")

        # CSVをParquetに変換（圧縮指定あり）
        con.execute(f"""
            COPY (SELECT * FROM read_csv_auto('{temp_input}', parallel=True)) 
            TO '{temp_output}' (FORMAT PARQUET, COMPRESSION 'SNAPPY');
        """)
        con.close()

        # 変換したファイルをS3にアップロード
        s3.upload_file(temp_output, destination_bucket, destination_key)

        # 一時ファイルを削除
        os.remove(temp_input)
        os.remove(temp_output)

        execution_time = time.time() - start_time
        print(f"処理完了: 実行時間 {execution_time:.2f}秒")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "CSV to Parquet conversion completed successfully with DuckDB",
                    "execution_time": execution_time,
                    "source": source_path,
                    "destination": destination_path,
                }
            ),
        }

    except Exception as e:
        print(f"エラー発生: {str(e)}")
        raise e
