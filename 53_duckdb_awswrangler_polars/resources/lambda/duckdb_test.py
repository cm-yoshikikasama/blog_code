import os
import time
import json
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

    try:
        # 処理開始をログ出力
        print(f"処理開始: {source_key}")

        # DuckDBを使用してCSVをParquetに変換（S3から直接読み込み、S3に直接書き込み）
        con = duckdb.connect(database=":memory:")
        con.execute("SET home_directory='/tmp'")  # Lambdaの一時ディレクトリに設定

        # httpfs拡張をインストールしてロード
        con.execute("INSTALL httpfs;")
        con.execute("LOAD httpfs;")

        # CSVをParquetに変換（圧縮指定あり）
        con.execute(f"""
            COPY (SELECT * FROM read_csv_auto('{source_path}', parallel=True)) 
            TO '{destination_path}' (FORMAT PARQUET, COMPRESSION 'SNAPPY');
        """)
        con.close()

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
