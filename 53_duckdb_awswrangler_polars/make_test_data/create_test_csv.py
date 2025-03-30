import pandas as pd
import random
import os
import sys


def create_sample_csv(filename="sample_data.csv", rows=1000000):
    """
    より一般的な文字列データを含むCSVファイルを作成する関数

    Parameters:
    filename (str): 作成するCSVファイルの名前
    rows (int): 行数
    """
    print(f"{rows}行のデータを生成中...")

    # 会社名のサンプル
    companies = [
        "Acme Corp",
        "Globex",
        "Initech",
        "Umbrella Corp",
        "Stark Industries",
        "Wayne Enterprises",
        "Cyberdyne Systems",
        "Soylent Corp",
        "Massive Dynamic",
        "Weyland-Yutani",
        "Oscorp",
        "Gekko & Co",
        "Wonka Industries",
        "Duff Brewing",
    ]

    # 製品カテゴリ
    categories = [
        "Electronics",
        "Clothing",
        "Food",
        "Home Goods",
        "Office Supplies",
        "Sporting Goods",
        "Toys",
        "Books",
        "Health",
        "Automotive",
    ]

    # 国名
    countries = [
        "USA",
        "Canada",
        "UK",
        "Germany",
        "France",
        "Japan",
        "China",
        "Australia",
        "Brazil",
        "India",
        "Mexico",
        "Spain",
        "Italy",
        "Russia",
    ]

    # 都市名
    cities = [
        "New York",
        "London",
        "Tokyo",
        "Paris",
        "Berlin",
        "Sydney",
        "Toronto",
        "Shanghai",
        "Mumbai",
        "Rio de Janeiro",
        "Mexico City",
        "Madrid",
        "Rome",
        "Moscow",
    ]

    # メールドメイン
    email_domains = [
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
        "company.com",
        "example.org",
        "business.net",
        "mail.co",
        "webmail.info",
        "protonmail.com",
    ]

    # ランダムデータの生成
    data = {
        "customer_id": [f"CUST-{random.randint(10000, 99999)}" for _ in range(rows)],
        "full_name": [
            f"{random.choice(['John', 'Jane', 'Robert', 'Mary', 'David', 'Sarah', 'Michael', 'Lisa', 'James', 'Emily'])} {random.choice(['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White'])}"
            for _ in range(rows)
        ],
        "email": [
            f"user{random.randint(100, 999)}@{random.choice(email_domains)}"
            for _ in range(rows)
        ],
        "phone": [
            f"+{random.randint(1, 9)}-{random.randint(100, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
            for _ in range(rows)
        ],
        "company": [random.choice(companies) for _ in range(rows)],
        "purchase_amount": [
            f"${random.randint(10, 1000)}.{random.randint(0, 99):02d}"
            for _ in range(rows)
        ],
        "category": [random.choice(categories) for _ in range(rows)],
        "country": [random.choice(countries) for _ in range(rows)],
        "city": [random.choice(cities) for _ in range(rows)],
        "status": [
            random.choice(["Completed", "Pending", "Cancelled", "Refunded", "Shipped"])
            for _ in range(rows)
        ],
    }

    # DataFrameの作成
    df = pd.DataFrame(data)

    # CSVに保存
    df.to_csv(filename, index=False)

    # ファイルサイズの確認
    file_size = os.path.getsize(filename) / (1024 * 1024)  # MBに変換
    print(f"ファイル '{filename}' の作成が完了しました。")
    print(f"行数: {rows}、列数: {len(df.columns)}")
    print(f"ファイルサイズ: {file_size:.2f} MB")

    return filename


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("使用方法: python create_sample_data.py <ファイル名> <行数>")
        sys.exit(1)

    filename = sys.argv[1]
    rows = int(sys.argv[2])

    create_sample_csv(filename, rows)
