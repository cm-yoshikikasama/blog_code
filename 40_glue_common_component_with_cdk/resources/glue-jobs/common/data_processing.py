import pandas as pd
from io import StringIO
from datetime import datetime
from zoneinfo import ZoneInfo


def get_current_time():
    return datetime.now(ZoneInfo("Asia/Tokyo"))


def calculate_years_in_zoo(df, arrival_year_column):

    current_year = get_current_time().year
    df["years_in_zoo"] = current_year - df[arrival_year_column]
    return df


def categorize_age(df, age_column="age_years"):
    """
    Categorizes animals based on their age.
    Adds a new column 'age_category'.
    """

    def get_age_category(age):
        if age < 5:
            return "Young"
        elif age < 10:
            return "Adult"
        else:
            return "Senior"

    df["age_category"] = df[age_column].apply(get_age_category)
    return df


def read_csv_from_s3(s3_client, bucket, key):
    response = s3_client.get_object(Bucket=bucket, Key=key)
    return pd.read_csv(response["Body"])


def write_csv_to_s3(s3_client, df, bucket, key):
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    s3_client.put_object(Bucket=bucket, Key=key, Body=csv_buffer.getvalue())


def process_data(df):
    df = calculate_years_in_zoo(df, "arrival_year")
    df = categorize_age(df, "age_years")
    return df
