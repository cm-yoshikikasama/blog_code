FROM public.ecr.aws/lambda/python:3.12@sha256:542771a596236be302beae1cb56f5ebd89608b3878b97428bf55b36aaeefa2c2

# Generate requirements.txt: echo "dbt-charts==0.10.0" | uv pip compile - --generate-hashes --python-version 3.12 --python-platform aarch64-manylinux2014 --no-emit-package uuid -o requirements.txt
# dbtlabs-vortex (a dct dependency) requires the PyPI uuid package (1.30, for Python 2). On Lambda it shadows the
# standard library uuid and the function fails to start, so it is excluded and packages are installed with --no-deps
COPY lambda/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --require-hashes --no-deps -r /tmp/requirements.txt

# Install the DuckDB extensions at build time. handler.py copies them to /tmp at run time
RUN mkdir -p /opt/duckdb_home && HOME=/opt/duckdb_home python -c "import duckdb; c = duckdb.connect(); [c.execute(f'INSTALL {e}') for e in ['iceberg', 'httpfs', 'avro']]"

# Build from the sample root: docker build -f lambda/Dockerfile .
COPY lambda/handler.py ${LAMBDA_TASK_ROOT}/
COPY dbt/dbt_charts.yml ${LAMBDA_TASK_ROOT}/dashboard/
COPY dbt/charts ${LAMBDA_TASK_ROOT}/dashboard/charts

CMD ["handler.lambda_handler"]
