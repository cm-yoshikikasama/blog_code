import base64
import json
import os
import shutil
import subprocess
import urllib.parse
import urllib.request

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

DASHBOARD_SRC = os.path.join(os.environ.get("LAMBDA_TASK_ROOT", "."), "dashboard")
# /var/task は読み取り専用のため、/tmp にコピーしてから dct を実行する
WORK_DIR = "/tmp/dashboard"
OUTPUT_HTML = "/tmp/index.html"
# ビルド時に入れたDuckDBの拡張機能。HOME=/tmp のときの既定の場所(/tmp/.duckdb)へコピーする
DUCKDB_HOME_SRC = "/opt/duckdb_home/.duckdb"


def get_horizon_token():
    """Lambdaの実行ロールでGetCallerIdentityに署名し、Horizonのアクセストークンに交換する"""
    region = os.environ["AWS_REGION"]
    sts_host = f"sts.{region}.amazonaws.com"
    credentials = boto3.Session().get_credentials().get_frozen_credentials()

    request = AWSRequest(
        method="POST",
        url=f"https://{sts_host}/?Action=GetCallerIdentity&Version=2011-06-15",
        headers={"Host": sts_host, "X-Snowflake-Audience": "snowflakecomputing.com"},
    )
    SigV4Auth(credentials, "sts", region).add_auth(request)
    attestation = base64.b64encode(
        json.dumps(
            {"url": request.url, "method": request.method, "headers": dict(request.headers.items())}
        ).encode()
    ).decode()

    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_secret": attestation,
            "scope": f"session:role:{os.environ['HORIZON_ROLE']}",
        }
    ).encode()
    token_request = urllib.request.Request(
        f"{os.environ['HORIZON_URL']}/v1/oauth/tokens",
        data=body,
        headers={"X-Snowflake-Workload-Identity-Provider": "AWS"},
    )
    with urllib.request.urlopen(token_request, timeout=30) as response:
        return json.load(response)["access_token"]


def lambda_handler(_event, _context):
    shutil.copytree(DASHBOARD_SRC, WORK_DIR, dirs_exist_ok=True)
    shutil.copytree(DUCKDB_HOME_SRC, "/tmp/.duckdb", dirs_exist_ok=True)
    # DO_NOT_TRACK=1でdctの利用統計(dbtlabs-vortex経由でdbt Labsへ送信)を止める
    env = {**os.environ, "HOME": "/tmp", "DO_NOT_TRACK": "1", "HORIZON_TOKEN": get_horizon_token()}

    subprocess.run(
        [
            "dct", "--no-workspace-guard", "--no-send-anonymous-usage-stats", "render", "charts/order_overview.yml",
            "--format", "html", "-o", OUTPUT_HTML,
        ],
        cwd=WORK_DIR,
        env=env,
        check=True,
    )

    boto3.client("s3").upload_file(
        OUTPUT_HTML,
        os.environ["HTML_BUCKET"],
        "index.html",
        ExtraArgs={"ContentType": "text/html; charset=utf-8"},
    )
    return {"status": "ok"}
