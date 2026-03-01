import json
import os
import time

import awswrangler as wr


def lambda_handler(event, context):
    start_time = time.time()

    # S3バケット情報を取得
    source_bucket = os.environ.get("source_bucket")
    source_key = os.environ.get("source_key")
    destination_bucket = os.environ.get("destination_bucket")
    destination_key = os.environ.get("destination_key")

    source_path = f"s3://{source_bucket}/{source_key}"
    destination_path = f"s3://{destination_bucket}/{destination_key}"

    try:
        # 処理開始をログ出力
        print(f"処理開始: {source_key}")

        # AWS Data Wranglerを使用してCSVを直接読み込み、Parquetとして保存
        df = wr.s3.read_csv(source_path)
        wr.s3.to_parquet(
            df=df,
            path=destination_path,
            compression="snappy",  # 圧縮方式を明示的に指定
        )

        execution_time = time.time() - start_time
        print(f"処理完了: 実行時間 {execution_time:.2f}秒")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": (
                        "CSV to Parquet conversion completed"
                        " successfully with AWS Data Wrangler"
                    ),
                    "execution_time": execution_time,
                    "source": source_path,
                    "destination": destination_path,
                }
            ),
        }

    except Exception as e:
        print(f"エラー発生: {str(e)}")
        raise e
