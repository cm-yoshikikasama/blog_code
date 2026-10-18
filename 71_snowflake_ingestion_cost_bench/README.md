# 71_snowflake_ingestion_cost_bench

Benchmark code that compares the processing time and billed credits of four ways to use the same uncompressed CSV files on S3 in Snowflake: external table, user-managed Task, serverless Task, and Snowpipe.

You need Terraform, the AWS CLI, and the Snowflake CLI (or Snowsight). Test data is generated in AWS CloudShell.

## Conditions

- Snowflake: AWS Asia Pacific (Tokyo), Enterprise Edition
- Warehouse: Gen2 X-Small, `AUTO_SUSPEND=60`
- Data size: 10MB, 100MB, 1GB
- Runs: Tasks, Snowpipe loads, and references are each run 3 times
- Reference: CTAS with the result cache disabled

## Layout

| File | Purpose |
| --- | --- |
| `terraform/` | S3, IAM role, S3 event notifications, and Snowflake objects |
| `scripts/generate_data.py` | Generates the test data and uploads it to S3 |
| `sql/01_refresh_external.sql` | Loads the S3 file list into the external tables |
| `sql/02_run_tasks.sql` | Truncates the target tables and runs each Task once |
| `sql/03_reset_snowpipe.sql` | Truncates the Snowpipe target tables |
| `sql/04_reference.sql` | Reads each of the 4 configurations' tables once with CTAS |
| `sql/05_measure.sql` | Aggregates the history and outputs the per-configuration results and monthly cost tables |
| `sql/check.sql` | Shows Task run states and target table row counts |

Terraform state is stored locally in `terraform/terraform.tfstate` (excluded by `.gitignore`).

## Steps

### 1. Create the environment

```bash
export AWS_PROFILE='<aws-profile>'
export SNOWFLAKE_ORGANIZATION_NAME='<snowflake-organization-name>'
export SNOWFLAKE_ACCOUNT_NAME='<snowflake-account-name>'
export SNOWFLAKE_USER='<snowflake-user>'
export SNOWFLAKE_AUTHENTICATOR='PROGRAMMATIC_ACCESS_TOKEN'
export SNOWFLAKE_TOKEN='<snowflake-pat>'

terraform -chdir=terraform init
terraform -chdir=terraform apply
```

On the first run, creating the Pipes may fail while the IAM role change propagates. Wait about 30 seconds and run `terraform apply` again.

### 2. Generate the test data

Upload `scripts/generate_data.py` to AWS CloudShell and run it.

```bash
python3 generate_data.py --bucket <bucket_name>
```

Get `<bucket_name>` with `terraform -chdir=terraform output bucket_name`.

### 3. Measure

1. Run `sql/01_refresh_external.sql`
2. Run `sql/02_run_tasks.sql` 3 times, about 2.5 minutes apart
3. Run `sql/03_reset_snowpipe.sql`, then run `aws s3 cp --recursive s3://<bucket_name>/cost-bench/<SIZE>/ s3://<bucket_name>/cost-bench/snowpipe/<SIZE>/run1/` for each of the 3 sizes. When `sql/check.sql` shows the expected row counts, repeat with `run2` and `run3`
4. Run `sql/04_reference.sql` 3 times
5. Run `sql/05_measure.sql`

`05_measure.sql` aggregates only the history recorded after the database was created. To measure again, run `terraform destroy` and start over from step 1.

## Clean up

```bash
terraform -chdir=terraform destroy
```

The S3 bucket has `force_destroy=true`, so the test data is deleted as well.
