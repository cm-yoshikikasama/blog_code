import json
import os

import boto3
import duckdb


def lambda_handler(event, _context):
    """
    Lambda handler for cross-account Iceberg data copy using DuckDB
    """
    # パラメータ取得（環境変数から）
    source_bucket = os.environ["SOURCE_BUCKET"]
    source_prefix = os.environ["SOURCE_PREFIX"]
    target_database = os.environ["TARGET_DATABASE"]
    target_table = os.environ["TARGET_TABLE"]

    # パラメータ取得（実行時入力から）
    target_date = event["TARGET_DATE"]

    print("Lambda started")
    print(f"Target: {target_database}.{target_table} (date={target_date})")

    try:
        # DuckDB初期化
        con = duckdb.connect(":memory:")
        con.execute("SET home_directory='/tmp';")
        con.execute("SET extension_directory='/tmp/duckdb_extensions';")
        print("DuckDB初期化完了")

        # AWS認証情報を設定
        con.execute("""
            CREATE SECRET (
                TYPE S3,
                PROVIDER CREDENTIAL_CHAIN
            );
        """)
        print("S3 SECRET作成完了")

        # S3 データ読み取り
        source_path = (
            f"s3://{source_bucket}/{source_prefix}/sample_data_{target_date}.csv"
        )
        print(f"Reading: {source_path}")

        query = f"SELECT * FROM read_csv_auto('{source_path}')"
        df = con.execute(query).fetch_arrow_table()
        row_count = len(df)
        print(f"Rows read: {row_count:,}")

        if row_count == 0:
            print("No data found")
            con.close()
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "No data found", "rows_inserted": 0}),
            }

        # Glue カタログ接続（アカウントIDを使用）
        account_id = boto3.client("sts").get_caller_identity()["Account"]
        con.execute(
            f"""
            ATTACH '{account_id}' AS glue_catalog (
                TYPE iceberg,
                ENDPOINT_TYPE 'glue'
            );
        """
        )
        print(f"Glue カタログ接続完了: Account={account_id}")

        # Iceberg テーブルに対する処理
        table_identifier = f"glue_catalog.{target_database}.{target_table}"

        # 既存のデータを削除（重複防止）
        delete_query = f"DELETE FROM {table_identifier} WHERE date = '{target_date}'"
        print(f"Deleting existing data for date={target_date}...")
        con.execute(delete_query)
        print("DELETE完了")

        # データを insert
        print(f"Inserting into {table_identifier}...")
        con.execute(f"INSERT INTO {table_identifier} SELECT * FROM df")
        print("INSERT完了")

        con.close()

        print(f"Lambda completed: {row_count:,} rows inserted")

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "Data copy completed successfully",
                    "rows_inserted": row_count,
                    "target_table": f"{target_database}.{target_table}",
                    "target_date": target_date,
                }
            ),
        }

    except Exception as e:
        error_message = f"Lambda failed: {str(e)}"
        print(error_message)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": error_message}),
        }
