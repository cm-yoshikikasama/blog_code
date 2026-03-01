import json
import os
import time

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()


def get_db_credential(input_parameter_name):
    ssm = boto3.client("ssm")
    response = ssm.get_parameter(Name=input_parameter_name, WithDecryption=True)
    return response["Parameter"]["Value"]


# Redshift接続情報
WORK_GROUP_NAME = os.environ["WORK_GROUP_NAME"]
DB_NAME = get_db_credential(os.environ["DB_NAME"])


class LambdaException(Exception):
    def __init__(self, status_code: int, error_msg: str):
        self.status_code = status_code
        self.error_msg = error_msg

    def __str__(self):
        obj = {"Status": self.status_code, "ErrorReason": self.error_msg}
        return json.dumps(obj)


class BadRequestException(LambdaException):
    def __init__(self, error_msg: str):
        super().__init__(400, error_msg)


class InternalServerErrorException(LambdaException):
    def __init__(self, error_msg: str):
        super().__init__(500, error_msg)


# selectするメソッド
# ======================================
# Parameters.
# target_table.    : select対象テーブル
# --------------------------------------
def execute_select_query(target_table):
    redshift_client = boto3.client("redshift-data")
    select_query = 'SELECT count(*) FROM public."%s"' % (target_table)
    print(select_query)

    result = redshift_client.execute_statement(
        WorkgroupName=WORK_GROUP_NAME,
        Database=DB_NAME,
        Sql=select_query,
    )
    start_time = time.time()
    # 実行IDを取得
    id = result["Id"]

    # クエリが終わるのを待つ
    statement = ""
    status = ""
    while status != "FINISHED" and status != "FAILED" and status != "ABORTED":
        statement = redshift_client.describe_statement(Id=id)
        status = statement["Status"]
        print("Status:", status)
        time.sleep(1)
    end_time = time.time()
    print("process_time:", end_time - start_time)
    logger.info(json.dumps(statement, indent=4, default=str))
    # 結果の表示
    try:
        statement = redshift_client.get_statement_result(Id=id)
        logger.info(json.dumps(statement, indent=4, default=str))
        return statement["Records"][0][0]["longValue"]
    except Exception:
        if status == "FAILED" or status == "ABORTED":
            raise BadRequestException(f"{statement}")


@logger.inject_lambda_context(log_event=True)
def handler(event, context: LambdaContext):
    try:
        body = event["body"]
        result_value = execute_select_query(body["target_table"])
        return {
            "Status": 200,
            "body": json.dumps(
                {
                    "Status": "success",
                    "result_value": result_value,
                    "ErrorReason": "None",
                }
            ),
        }
    except Exception as e:
        logger.error(e)
        if e.__class__.__name__ == "BadRequestException":
            raise
        raise InternalServerErrorException(str(e))
