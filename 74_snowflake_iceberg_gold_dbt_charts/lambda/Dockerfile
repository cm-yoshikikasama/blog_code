FROM public.ecr.aws/lambda/python:3.12@sha256:542771a596236be302beae1cb56f5ebd89608b3878b97428bf55b36aaeefa2c2

# requirements.txtの生成: echo "dbt-charts==0.10.0" | uv pip compile - --generate-hashes --python-version 3.12 --python-platform aarch64-manylinux2014 --no-emit-package uuid -o requirements.txt
# dbtlabs-vortex(dctの依存)がPyPIのuuidパッケージ(1.30、Python 2向け)を要求する。Lambdaでは標準ライブラリのuuidの代わりに読み込まれて起動に失敗するため、除外して--no-depsで入れる
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --require-hashes --no-deps -r /tmp/requirements.txt

# DuckDBの拡張機能はビルド時に入れ、handler.pyが起動時に/tmpへコピーする
RUN mkdir -p /opt/duckdb_home && HOME=/opt/duckdb_home python -c "import duckdb; c = duckdb.connect(); [c.execute(f'INSTALL {e}') for e in ['iceberg', 'httpfs', 'avro']]"

COPY handler.py ${LAMBDA_TASK_ROOT}/
COPY dashboard ${LAMBDA_TASK_ROOT}/dashboard

CMD ["handler.lambda_handler"]
