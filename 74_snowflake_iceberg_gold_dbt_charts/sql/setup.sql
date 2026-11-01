-- Run once as ACCOUNTADMIN. Creates a dedicated role and service user so that Terraform and dbt do not use ACCOUNTADMIN
-- snow sql -c <connection> --role ACCOUNTADMIN -D "public_key=<public-key>" -f sql/setup.sql
-- Your own user is not changed
use role ACCOUNTADMIN;

-- Role for Terraform and dbt. This demo uses the same role for both
create role if not exists CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE
  comment = 'Role used by Terraform and dbt';
grant create database, create warehouse, create external volume, create role, create user
  on account to role CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE;

-- Service user that logs in with a key pair. It has no password and no PAT
create user if not exists CM_KASAMA_ICEBERG_BI_DEPLOY_SVC
  type = service
  default_role = CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE
  rsa_public_key = '<% public_key %>'
  comment = 'Service user used by Terraform and dbt';
grant role CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE to user CM_KASAMA_ICEBERG_BI_DEPLOY_SVC;
