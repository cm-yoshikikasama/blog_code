import sys
from awsglue.utils import getResolvedOptions

# 引数を取得
args = getResolvedOptions(sys.argv, ["env", "project"])

# 単純な出力
print(f"Environment: {args['env']}")
print(f"Project: {args['project']}")
print("Hello from Glue Python Shell Job!")
