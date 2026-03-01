import json
import os
import re
from datetime import datetime, timezone

import boto3
import duckdb

s3_client = boto3.client("s3")

SOURCE_BUCKET = os.environ["SOURCE_BUCKET"]
SOURCE_PREFIX = os.environ["SOURCE_PREFIX"]
TARGET_DATABASE = os.environ["TARGET_DATABASE"]
TARGET_TABLE = os.environ["TARGET_TABLE"]


def lambda_handler(event: dict, _context) -> dict:
    target_date = event["target_date"]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", target_date):
        raise ValueError(f"Invalid date format: {target_date}")

    print("Lambda started")
    print(f"Target: {TARGET_DATABASE}.{TARGET_TABLE} (date={target_date})")

    con = duckdb.connect(":memory:")
    con.execute("SET home_directory='/tmp';")
    con.execute("SET extension_directory='/tmp/duckdb_extensions';")

    con.execute("CREATE SECRET (TYPE S3, PROVIDER CREDENTIAL_CHAIN)")

    source_path = f"s3://{SOURCE_BUCKET}/{SOURCE_PREFIX}/orders_{target_date}.csv"
    df = con.execute(
        f"""
        SELECT
            *,
            CURRENT_TIMESTAMP AS processed_at
        FROM read_csv_auto('{source_path}')
    """
    ).fetch_arrow_table()

    row_count = len(df)
    print(f"Rows read: {row_count:,}")

    if row_count == 0:
        con.close()
        return {"statusCode": 200, "body": json.dumps({"rows_inserted": 0})}

    account_id = boto3.client("sts").get_caller_identity()["Account"]
    con.execute(
        f"""
        ATTACH '{account_id}' AS glue_catalog (
            TYPE iceberg,
            ENDPOINT_TYPE 'glue'
        )
    """
    )

    table_id = f"glue_catalog.{TARGET_DATABASE}.{TARGET_TABLE}"
    con.execute(f"DELETE FROM {table_id} WHERE order_date = ?", [target_date])
    con.execute(f"INSERT INTO {table_id} SELECT * FROM df")
    con.close()

    source_key = f"{SOURCE_PREFIX}/orders_{target_date}.csv"
    now = datetime.now(timezone.utc)
    archive_key = f"archive/{now:%Y/%m/%d}/orders_{target_date}.csv"
    s3_client.copy_object(
        Bucket=SOURCE_BUCKET,
        CopySource={"Bucket": SOURCE_BUCKET, "Key": source_key},
        Key=archive_key,
    )
    s3_client.delete_object(Bucket=SOURCE_BUCKET, Key=source_key)

    print(f"Lambda completed: {row_count:,} rows inserted")
    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "rows_inserted": row_count,
                "target_date": target_date,
            }
        ),
    }
