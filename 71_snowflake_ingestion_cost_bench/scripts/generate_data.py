"""注文データのCSVを10MB・100MB・1GB分作り、約200MBずつのファイルに分けてS3に置く。

使い方(AWS CloudShellで実行する):
    python3 generate_data.py --bucket <bucket>

置き場所: s3://<bucket>/cost-bench/<サイズ>/
"""

import argparse
import csv
import hashlib
import os
import random
import tempfile
from datetime import date, timedelta

import boto3

SIZE_BYTES = {"10MB": 10_000_000, "100MB": 100_000_000, "1GB": 1_000_000_000}
FILE_BYTES = 200_000_000  # 1ファイルの目安のサイズ


def make_order_row(order_id: int) -> list:
    """注文データ1行分(9列)を作る。"""
    digest = hashlib.sha256(f"order-{order_id}".encode()).hexdigest()
    return [
        order_id,
        random.randint(1, 1_000_000),  # customer_id
        random.choice(["O", "F", "P"]),  # order_status
        round(random.uniform(100, 500_000), 2),  # total_price
        (date(2026, 1, 1) + timedelta(days=random.randint(0, 365))).isoformat(),  # order_date
        random.choice(["1-URGENT", "2-HIGH", "3-MEDIUM", "4-NOT SPECIFIED", "5-LOW"]),
        digest[:15],  # clerk
        random.randint(0, 1),  # ship_priority
        digest[:60],  # order_comment
    ]


def generate_and_upload(s3, bucket: str, size_label: str) -> None:
    """1サイズ分のCSVを約200MBずつのファイルに分けて作り、S3にアップロードする。"""
    random.seed(f"cost-bench:{size_label}")  # 何度実行しても同じデータにする
    target_bytes = SIZE_BYTES[size_label]
    total_bytes = 0
    total_rows = 0
    file_number = 0

    while total_bytes < target_bytes:
        this_file_bytes = min(FILE_BYTES, target_bytes - total_bytes)
        key = f"cost-bench/{size_label}/orders_{file_number:04d}.csv"

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="", suffix=".csv") as tmp:
            writer = csv.writer(tmp)
            # 1,000行ずつ書き、ファイルが目安のサイズを超えたら次のファイルに移る
            while True:
                for _ in range(1_000):
                    total_rows += 1
                    writer.writerow(make_order_row(total_rows))
                tmp.flush()
                if tmp.tell() >= this_file_bytes:
                    break
            file_bytes = os.path.getsize(tmp.name)
            s3.upload_file(tmp.name, bucket, key)

        total_bytes += file_bytes
        file_number += 1
        print(f"uploaded s3://{bucket}/{key} ({file_bytes:,} bytes)")

    print(f"{size_label}: {file_number} files, {total_bytes:,} bytes, {total_rows:,} rows")


def main() -> None:
    """--bucket で指定したバケットに、3サイズのテストデータを置く。"""
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("-b", "--bucket", required=True)
    args = parser.parse_args()

    s3 = boto3.client("s3")
    for size_label in SIZE_BYTES:
        generate_and_upload(s3, args.bucket, size_label)


if __name__ == "__main__":
    main()
