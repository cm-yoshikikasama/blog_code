# 73_dbt_charts_athena

Sample that connects the dbt Charts CLI (`dct`) to an Amazon Athena + Iceberg dbt project via `type: dbt_profile` and displays an order overview board.

Requires the AWS CLI and uv.

## Structure

| File | Purpose |
| --- | --- |
| `cfn/datastore.yaml` | S3 bucket and Glue Database |
| `docs/architecture.drawio` | Architecture diagram |
| `dbt/profiles.yml` | Athena connection shared by dbt and dct |
| `dbt/dbt_charts.yml` | dct source definition (`type: dbt_profile`) |
| `dbt/seeds/` | Sample data based on jaffle_shop |
| `dbt/models/` | staging (views) and marts (Iceberg tables) |
| `dbt/charts/order_overview.yml` | dct board |

## Usage

```bash
aws cloudformation deploy --profile <your-profile> --region ap-northeast-1 \
  --stack-name <stack-name> --template-file cfn/datastore.yaml

uv tool install 'dbt-charts[athena]'
cd dbt
uv sync

export AWS_PROFILE=<your-profile>
export DBT_S3_BUCKET=<DataBucketName output>

uv run dbt build --profiles-dir .
dct validate charts/
dct serve --port 8080
```

Open `http://localhost:8080/order_overview/` in a browser to see the board.

## Cleanup

Delete the Glue tables, empty the S3 bucket, then delete the stack.

```bash
aws glue batch-delete-table --profile <your-profile> --region ap-northeast-1 \
  --database-name cm_kasama_jaffle_shop_dev \
  --tables-to-delete raw_customers raw_orders stg_customers stg_orders customer_orders order_status_summary
aws s3 rm s3://<DataBucketName output> --recursive --profile <your-profile>
aws cloudformation delete-stack --profile <your-profile> --region ap-northeast-1 --stack-name <stack-name>
```
