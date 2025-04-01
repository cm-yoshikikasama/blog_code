import sys
import json
import duckdb
from awsglue.utils import getResolvedOptions


def main():
    args = getResolvedOptions(
        sys.argv,
        [
            "file_bucket",
            "file_key",
            "total_raws",
        ],
    )
    file_bucket = args["file_bucket"]
    file_key = args["file_key"]
    total_rows = int(args["total_raws"])

    # S3パスを構築
    s3_path = f"s3://{file_bucket}/{file_key}"

    print(f"{total_rows}行のデータを生成してS3にアップロード中...")

    # 一時ディレクトリを設定
    duckdb.sql("SET home_directory='/tmp';")
    duckdb.sql("SET extension_directory='/tmp/duckdb_extensions';")

    # AWS認証情報を設定
    duckdb.sql("""CREATE SECRET (
        TYPE S3,
        PROVIDER CREDENTIAL_CHAIN
    );""")

    # 会社名、カテゴリなどのリストをDuckDBのテーブルとして作成
    create_lookup_tables()

    # データ生成とS3へのアップロード
    generate_and_upload_data(s3_path, total_rows)
    print("データ生成とアップロードが完了しました。")
    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "message": "CSV generation completed successfully",
                "rows": total_rows,
                "destination": s3_path,
            }
        ),
    }


def create_lookup_tables():
    """参照用のルックアップテーブルを作成"""

    # 会社名のテーブル
    duckdb.execute("""
        CREATE TABLE companies AS SELECT * FROM (
            VALUES
                ('Acme Corp'), ('Globex'), ('Initech'), ('Umbrella Corp'),
                ('Stark Industries'), ('Wayne Enterprises'), ('Cyberdyne Systems'),
                ('Soylent Corp'), ('Massive Dynamic'), ('Weyland-Yutani'),
                ('Oscorp'), ('Gekko & Co'), ('Wonka Industries'), ('Duff Brewing')
        ) t(name);
    """)

    # 製品カテゴリのテーブル
    duckdb.execute("""
        CREATE TABLE categories AS SELECT * FROM (
            VALUES
                ('Electronics'), ('Clothing'), ('Food'), ('Home Goods'),
                ('Office Supplies'), ('Sporting Goods'), ('Toys'), ('Books'),
                ('Health'), ('Automotive')
        ) t(name);
    """)

    # 国名のテーブル
    duckdb.execute("""
        CREATE TABLE countries AS SELECT * FROM (
            VALUES
                ('USA'), ('Canada'), ('UK'), ('Germany'), ('France'),
                ('Japan'), ('China'), ('Australia'), ('Brazil'), ('India'),
                ('Mexico'), ('Spain'), ('Italy'), ('Russia')
        ) t(name);
    """)

    # 都市名のテーブル
    duckdb.execute("""
        CREATE TABLE cities AS SELECT * FROM (
            VALUES
                ('New York'), ('London'), ('Tokyo'), ('Paris'), ('Berlin'),
                ('Sydney'), ('Toronto'), ('Shanghai'), ('Mumbai'), ('Rio de Janeiro'),
                ('Mexico City'), ('Madrid'), ('Rome'), ('Moscow')
        ) t(name);
    """)

    # メールドメインのテーブル
    duckdb.execute("""
        CREATE TABLE email_domains AS SELECT * FROM (
            VALUES
                ('gmail.com'), ('yahoo.com'), ('hotmail.com'), ('outlook.com'),
                ('company.com'), ('example.org'), ('business.net'), ('mail.co'),
                ('webmail.info'), ('protonmail.com')
        ) t(name);
    """)

    # 名前のテーブル
    duckdb.execute("""
        CREATE TABLE first_names AS SELECT * FROM (
            VALUES
                ('John'), ('Jane'), ('Robert'), ('Mary'), ('David'),
                ('Sarah'), ('Michael'), ('Lisa'), ('James'), ('Emily')
        ) t(name);
    """)

    # 姓のテーブル
    duckdb.execute("""
        CREATE TABLE last_names AS SELECT * FROM (
            VALUES
                ('Smith'), ('Johnson'), ('Williams'), ('Jones'), ('Brown'),
                ('Davis'), ('Miller'), ('Wilson'), ('Moore'), ('Taylor'),
                ('Anderson'), ('Thomas'), ('Jackson'), ('White')
        ) t(name);
    """)

    # ステータスのテーブル
    duckdb.execute("""
        CREATE TABLE statuses AS SELECT * FROM (
            VALUES
                ('Completed'), ('Pending'), ('Cancelled'), ('Refunded'), ('Shipped')
        ) t(name);
    """)


def generate_and_upload_data(s3_path, rows):
    """データを生成してS3に直接アップロード"""

    # 並列処理を有効にする設定
    duckdb.execute("SET threads TO 8;")  # Lambdaの環境に合わせて調整

    sql = f"""
    COPY (
        SELECT
            'CUST-' || (random() * 89999 + 10000)::INTEGER::VARCHAR AS customer_id,
            (SELECT name FROM first_names ORDER BY random() LIMIT 1) || ' ' || 
            (SELECT name FROM last_names ORDER BY random() LIMIT 1) AS full_name,
            'user' || (random() * 899 + 100)::INTEGER::VARCHAR || '@' || 
            (SELECT name FROM email_domains ORDER BY random() LIMIT 1) AS email,
            '+' || (random() * 8 + 1)::INTEGER::VARCHAR || '-' ||
            (random() * 899 + 100)::INTEGER::VARCHAR || '-' ||
            (random() * 899 + 100)::INTEGER::VARCHAR || '-' ||
            (random() * 8999 + 1000)::INTEGER::VARCHAR AS phone,
            (SELECT name FROM companies ORDER BY random() LIMIT 1) AS company,
            '$' || (random() * 990 + 10)::INTEGER::VARCHAR || '.' || 
            lpad((random() * 99)::INTEGER::VARCHAR, 2, '0') AS purchase_amount,
            (SELECT name FROM categories ORDER BY random() LIMIT 1) AS category,
            (SELECT name FROM countries ORDER BY random() LIMIT 1) AS country,
            (SELECT name FROM cities ORDER BY random() LIMIT 1) AS city,
            (SELECT name FROM statuses ORDER BY random() LIMIT 1) AS status
        FROM 
            generate_series(1, {rows})
    ) TO '{s3_path}' WITH (FORMAT CSV, HEADER);
    """

    # SQLを実行してデータを生成し、S3に直接アップロード
    duckdb.execute(sql)


if __name__ == "__main__":
    main()
