from io import StringIO

import pandas as pd
import pendulum

from common.get_logger import setup_logging

logger = setup_logging()


def get_current_time():
    current_time = pendulum.now("Asia/Tokyo")
    logger.info(f"Current time: {current_time}")
    return current_time


def read_csv_from_s3(s3_client, bucket, key):
    logger.info(f"Reading CSV from S3. Bucket: {bucket}, Key: {key}")
    response = s3_client.get_object(Bucket=bucket, Key=key)
    df = pd.read_csv(response["Body"])
    logger.info(f"Successfully read CSV. Shape: {df.shape}")
    return df


def write_csv_to_s3(s3_client, df, bucket, key):
    logger.info(f"Writing CSV to S3. Bucket: {bucket}, Key: {key}")
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    s3_client.put_object(Bucket=bucket, Key=key, Body=csv_buffer.getvalue())
    logger.info("Successfully wrote CSV to S3.")


def calculate_years_since_arrival(arrival_date, reference_date):
    return reference_date.diff(pendulum.parse(arrival_date)).in_years()


def process_data(df):
    logger.info("Starting data processing")
    logger.info(f"Input data shape: {df.shape}")

    # 現在の日付を取得
    now = pendulum.now()

    if "arrival_date" in df.columns:
        # 到着からの経過年数を計算
        df["years_since_arrival"] = df["arrival_date"].apply(
            lambda x: calculate_years_since_arrival(x, now)
        )
        logger.info("Added years since arrival")

    logger.info(f"Processed data shape: {df.shape}")
    logger.info("Data processing complete")
    return df
