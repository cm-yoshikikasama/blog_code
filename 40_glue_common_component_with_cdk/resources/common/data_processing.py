import pandas as pd
from io import StringIO
from datetime import datetime
from zoneinfo import ZoneInfo
from get_logger import setup_logging

logger = setup_logging()


def get_current_time():
    current_time = datetime.now(ZoneInfo("Asia/Tokyo"))
    logger.info(f"Current time: {current_time}")
    return current_time


def calculate_years_in_zoo(df, arrival_year_column):
    logger.info(f"Calculating years in zoo based on column: {arrival_year_column}")
    current_year = get_current_time().year
    df["years_in_zoo"] = current_year - df[arrival_year_column]
    logger.info(f"Years in zoo calculated. Added 'years_in_zoo' column.")
    return df


def categorize_age(df, age_column="age_years"):
    logger.info(f"Categorizing age based on column: {age_column}")

    def get_age_category(age):
        if age < 5:
            return "Young"
        elif age < 10:
            return "Adult"
        else:
            return "Senior"

    df["age_category"] = df[age_column].apply(get_age_category)
    logger.info("Age categorization complete. Added 'age_category' column.")
    return df


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


def process_data(df):
    logger.info("Starting data processing")
    logger.info(f"Input data shape: {df.shape}")

    df = calculate_years_in_zoo(df, "arrival_year")
    df = categorize_age(df, "age_years")

    logger.info(f"Processed data shape: {df.shape}")
    logger.info("Data processing complete")
    return df
