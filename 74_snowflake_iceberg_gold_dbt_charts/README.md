# 74_snowflake_iceberg_gold_dbt_charts

Sample that builds dashboard tables on Snowflake as Snowflake-managed Iceberg tables, and renders a dbt Charts dashboard from them with DuckDB on AWS Lambda without using a Snowflake warehouse.

Lambda authenticates to the Snowflake Horizon Iceberg REST catalog with its execution role (workload identity federation, `GetCallerIdentity` attestation). No password, PAT, or key pair is stored.

You need Terraform, the AWS CLI, Docker (or a compatible CLI), uv, and the Snowflake CLI (or Snowsight).

## Tables

| Schema | Table type | Built by |
| --- | --- | --- |
| SEED | Snowflake table | `dbt seed` (a small part of the jaffle_shop orders, customers, and payments) |
| GOLD | Snowflake-managed Iceberg table | dbt (`table_format: iceberg`) |

The dashboard reads only GOLD, through Horizon, and the Iceberg files are read directly from S3 by DuckDB. Horizon serves Snowflake-managed Iceberg tables, so only the tables that the dashboard reads are Iceberg tables.

## Layout

| File | Purpose |
| --- | --- |
| `terraform/snow-infra/` | Snowflake layer: database, warehouse, external volume, reader role, service user. Also decides the AWS resource names |
| `terraform/aws/` | AWS layer: S3, IAM roles, ECR, Lambda, CloudFront, AWS WAF (us-east-1) |
| `terraform/modules/` | Modules called by the two layers, one per resource type. `aws/` holds the AWS modules and `snow/` holds the Snowflake modules |
| `dbt/` | Seeds (sample CSVs) and the gold models (Iceberg tables): order count by status, revenue by payment method, revenue by customer |
| `lambda/handler.py` | Gets a Horizon access token with the execution role, runs `dct render`, and uploads the HTML to S3 |
| `lambda/Dockerfile` | Lambda image with dbt Charts and the DuckDB extensions (`iceberg`, `httpfs`, `avro`) preinstalled |
| `dbt/dbt_charts.yml`, `dbt/charts/` | dbt Charts source definition and board, at the dbt project root. Copied into the Lambda image |
| `sql/setup.sql` | Creates the role and the key-pair service user (run as ACCOUNTADMIN) |

Terraform is split into two root modules (layers) with separate state, and the resources are defined in `terraform/modules/`. Apply them in the order snow-infra, aws. The external volume and service user accept IAM role ARNs as strings and do not check that the roles exist until they are used. snow-infra builds those ARNs from the role names, creates the Snowflake objects first, and exports the names and the generated IAM user ARN and external ID. aws reads them with `terraform_remote_state`. Each layer stores its state locally in `terraform/<layer>/terraform.tfstate` (excluded by `.gitignore`).

## Steps

### 1. Create the role and the service user (once, as ACCOUNTADMIN)

Terraform and dbt do not use ACCOUNTADMIN and do not log in as your own user. `sql/setup.sql` creates one role and one service user that Terraform and dbt share, and the service user logs in with a key pair. The role gets only the account privileges it needs (create database, warehouse, external volume, role, and user).

```bash
KEY_PATH=~/.snowflake/cm_kasama_iceberg_bi_rsa_key.p8
KEY_PASSPHRASE='<passphrase>'
openssl genrsa 2048 | KEY_PASSPHRASE="$KEY_PASSPHRASE" openssl pkcs8 -topk8 -v2 aes-256-cbc -passout env:KEY_PASSPHRASE -out "$KEY_PATH"
chmod 600 "$KEY_PATH"
PUBLIC_KEY=$(KEY_PASSPHRASE="$KEY_PASSPHRASE" openssl rsa -in "$KEY_PATH" -passin env:KEY_PASSPHRASE -pubout 2>/dev/null | grep -v -- '-----' | tr -d '\n')

snow sql -c <admin-connection> --role ACCOUNTADMIN -D "public_key=${PUBLIC_KEY}" -f sql/setup.sql
```

Run step 1 before you export the `SNOWFLAKE_*` variables in step 2. The Snowflake CLI applies `SNOWFLAKE_*` environment variables to every connection, so `<admin-connection>` fails with them set. The private key is encrypted with the passphrase. A key pair does not expire, so drop the service user when you finish (see Clean up). `<admin-connection>` is a Snowflake CLI connection that can use ACCOUNTADMIN (for example browser SSO). This is a demo setup: in production, use separate roles for Terraform and dbt and run them from CI.

### 2. Create the Snowflake objects and the ECR repository

```bash
export AWS_PROFILE='<aws-profile>'
export SNOWFLAKE_ORGANIZATION_NAME='<snowflake-organization-name>'
export SNOWFLAKE_ACCOUNT_NAME='<snowflake-account-name>'
export SNOWFLAKE_USER='CM_KASAMA_ICEBERG_BI_DEPLOY_SVC'
export SNOWFLAKE_AUTHENTICATOR='SNOWFLAKE_JWT'
export SNOWFLAKE_PRIVATE_KEY_PATH="$KEY_PATH"
export SNOWFLAKE_PRIVATE_KEY_PASSPHRASE="$KEY_PASSPHRASE"
export SNOWFLAKE_PRIVATE_KEY="$(cat "$KEY_PATH")"
export TF_VAR_snowflake_account_identifier="${SNOWFLAKE_ORGANIZATION_NAME}-${SNOWFLAKE_ACCOUNT_NAME}"
export TF_VAR_allowed_cidrs='["<your-ip>/32"]'
# Do not send usage data to dbt Labs (dbt, dct) or to HashiCorp (Terraform version check)
export DO_NOT_TRACK=1
export CHECKPOINT_DISABLE=1

for layer in snow-infra aws; do terraform -chdir="terraform/${layer}" init; done
terraform -chdir=terraform/snow-infra apply
terraform -chdir=terraform/aws apply -target=module.dashboard_lambda.aws_ecr_repository.this
```

The Lambda function needs the image to exist, so the ECR repository is created first. `allowed_cidrs` accepts IPv4 CIDRs only. The CloudFront distribution has IPv6 disabled.

### 3. Build and push the Lambda image

```bash
ECR_URL=$(terraform -chdir=terraform/aws output -raw ecr_repository_url)
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin "${ECR_URL%%/*}"
docker build --platform linux/arm64 -f lambda/Dockerfile -t "${ECR_URL}:latest" .
docker push "${ECR_URL}:latest"
```

The base image is pinned by digest and the Python packages are pinned by hash in `lambda/requirements.txt`, so the build fails if a downloaded file differs. To update the packages, run the `uv pip compile` command written in `lambda/Dockerfile`.

The Lambda function refers to the image by digest, not by the `latest` tag. After you push a new image, run `terraform -chdir=terraform/aws apply` again to update the function.

### 4. Create the rest of the environment

```bash
terraform -chdir=terraform/aws apply
```

### 5. Build the tables

```bash
cd dbt
uv sync
uv run dbt build --profiles-dir .
cd ..
```

`dbt build` loads the seeds into SEED and creates the GOLD Iceberg tables. `profiles.yml` connects as the same service user with `SNOWFLAKE_PRIVATE_KEY_PATH` and `SNOWFLAKE_PRIVATE_KEY_PASSPHRASE`. `dbt_project.yml` sets `send_anonymous_usage_stats: false`.

### 6. Render the dashboard

```bash
aws lambda invoke --function-name cm-kasama-iceberg-bi-dashboard /dev/stdout
terraform -chdir=terraform/aws output -raw dashboard_url
```

Open the URL from an IP address in `allowed_cidrs`. AWS WAF blocks other IP addresses with 403. The web ACL is created in us-east-1 because WAF for CloudFront is available only there. `handler.py` runs `dct` with `DO_NOT_TRACK=1` and `--no-send-anonymous-usage-stats`, and DuckDB does not download extensions at run time.

## Clean up

```bash
for layer in aws snow-infra; do terraform -chdir="terraform/${layer}" destroy; done
```

Then drop the objects that `sql/setup.sql` created with `<admin-connection>` in a new shell without the `SNOWFLAKE_*` variables, and delete the private key.

```bash
snow sql -c <admin-connection> --role ACCOUNTADMIN -q "drop user if exists CM_KASAMA_ICEBERG_BI_DEPLOY_SVC; drop role if exists CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE;"
rm ~/.snowflake/cm_kasama_iceberg_bi_rsa_key.p8
```

Destroy in the reverse order of apply. aws reads the state of snow-infra, so snow-infra goes last. The S3 buckets have `force_destroy=true` and the ECR repository has `force_delete=true`, so the data and image are deleted as well.
