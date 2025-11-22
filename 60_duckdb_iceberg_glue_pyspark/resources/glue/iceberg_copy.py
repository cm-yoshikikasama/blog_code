import sys

import boto3
import duckdb
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext


def main():
    # パラメータ取得
    args = getResolvedOptions(
        sys.argv,
        [
            "JOB_NAME",
            "SOURCE_BUCKET",
            "SOURCE_PREFIX",
            "TARGET_DATABASE",
            "TARGET_TABLE",
            "TARGET_DATE",
        ],
    )

    # Glue 初期化
    sc = SparkContext()
    glueContext = GlueContext(sc)
    job = Job(glueContext)
    job.init(args["JOB_NAME"], args)

    print(f"Job started: {args['JOB_NAME']}")
    print(
        f"Target: {args['TARGET_DATABASE']}.{args['TARGET_TABLE']} "
        f"(date={args['TARGET_DATE']})"
    )

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
        source_path = f"s3://{args['SOURCE_BUCKET']}/{args['SOURCE_PREFIX']}/sample_data_{args['TARGET_DATE']}.csv"
        print(f"Reading: {source_path}")

        query = f"SELECT * FROM read_csv_auto('{source_path}')"
        df = con.execute(query).fetch_arrow_table()
        row_count = len(df)
        print(f"Rows read: {row_count:,}")

        if row_count == 0:
            print("No data found")
            con.close()
            job.commit()
            return

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

        # Iceberg テーブルに insert
        table_identifier = (
            f"glue_catalog.{args['TARGET_DATABASE']}.{args['TARGET_TABLE']}"
        )
        print(f"Inserting into {table_identifier}...")
        con.execute(f"INSERT INTO {table_identifier} SELECT * FROM df")
        print("INSERT完了")

        con.close()

        print(f"Job completed: {row_count:,} rows inserted")
        job.commit()

    except Exception as e:
        print(f"Job failed: {e}")
        raise


if __name__ == "__main__":
    main()
