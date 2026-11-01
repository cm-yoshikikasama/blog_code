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
# /var/task is read-only, so copy the files to /tmp before running dct
WORK_DIR = "/tmp/dashboard"
OUTPUT_HTML = "/tmp/index.html"
# DuckDB extensions installed at build time. Copied to the default location for HOME=/tmp (/tmp/.duckdb)
DUCKDB_HOME_SRC = "/opt/duckdb_home/.duckdb"


def get_horizon_token():
    """Sign GetCallerIdentity with the execution role and exchange it for a Horizon access token"""
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
    # DO_NOT_TRACK=1 stops dct usage stats (sent to dbt Labs through dbtlabs-vortex)
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
