import os
import time
import json
import polars as pl


def lambda_handler(event, context):
    start_time = time.time()
    # 専用のサブディレクトリを作成し、適切な権限を設定
    tmp_dir = "/tmp/polars_cache"

    # 環境変数を設定
    os.environ["POLARS_TEMP_DIR"] = tmp_dir

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

        # S3から直接CSVをスキャン
        df_lazy = pl.scan_csv(source_path, rechunk=True, low_memory=True)

        # S3に直接Parquetとして保存
        df_lazy.sink_parquet(destination_path, compression="snappy")

        execution_time = time.time() - start_time
        print(f"処理完了: 実行時間 {execution_time:.2f}秒")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "CSV to Parquet conversion completed successfully with Polars LazyFrame",
                    "execution_time": execution_time,
                    "source": source_path,
                    "destination": destination_path,
                }
            ),
        }

    except Exception as e:
        print(f"エラー発生: {str(e)}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
