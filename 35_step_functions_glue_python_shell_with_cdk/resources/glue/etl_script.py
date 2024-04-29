import sys
import traceback
import boto3
import pandas as pd
from io import StringIO
from datetime import datetime
from zoneinfo import ZoneInfo
from awsglue.utils import getResolvedOptions


def main():
    try:
        args = getResolvedOptions(
            sys.argv,
            [
                "S3_INPUT_BUCKET",
                "S3_INPUT_KEY",
                "S3_OUTPUT_BUCKET",
                "S3_OUTPUT_KEY_PREFIX",
            ],
        )
        # ジョブから渡されたパラメータを使用
        s3_input_bucket = args["S3_INPUT_BUCKET"]
        s3_input_key = args["S3_INPUT_KEY"]
        s3_output_bucket = args["S3_OUTPUT_BUCKET"]
        s3_output_key = args["S3_OUTPUT_KEY_PREFIX"]

        # Boto3クライアントの初期化
        s3_client = boto3.client("s3")

        # S3からCSVファイルを読み込む
        response = s3_client.get_object(Bucket=s3_input_bucket, Key=s3_input_key)
        input_data = pd.read_csv(response["Body"])

        # 動物園に来てからの年数を計算して新しい列に追加
        current_year = datetime.now(ZoneInfo("Asia/Tokyo")).year
        input_data["years_in_zoo"] = current_year - input_data["arrival_year"]

        # Pandas DataFrameをCSV文字列に変換
        output_csv = input_data.to_csv(index=False)
        output_file = StringIO(output_csv)

        current_time = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y-%m-%d-%H-%M-%S")
        # 現在の日時を取得し、ファイル名を生成
        output_filename = f"{s3_output_key}output_{current_time}.csv"

        # 加工後のCSVをS3に保存
        s3_client.put_object(
            Bucket=s3_output_bucket,
            Key=output_filename,
            Body=output_file.getvalue(),
        )
    except Exception as e:
        tb = traceback.format_exc()
        print(f"Unexpected error: {str(e)}\nTraceback: {tb}")
        raise e


if __name__ == "__main__":
    main()
