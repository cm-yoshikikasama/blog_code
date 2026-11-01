-- 最初に1回だけACCOUNTADMINで実行する。TerraformとdbtがACCOUNTADMINを使わずに済むように、専用のロールとservice userを作る
-- snow sql -c <接続> --role ACCOUNTADMIN -D "public_key=<公開鍵>" -f sql/setup.sql
-- 自分のユーザーは変更しない
use role ACCOUNTADMIN;

-- TerraformとdbtのロールとWarehouse以外の権限。デモなのでTerraformとdbtで同じロールを使う
create role if not exists CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE
  comment = 'Terraformとdbtが使うロール';
grant create database, create warehouse, create external volume, create role, create user
  on account to role CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE;

-- キーペアでログインするservice user。パスワードもPATも持たない
create user if not exists CM_KASAMA_ICEBERG_BI_DEPLOY_SVC
  type = service
  default_role = CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE
  rsa_public_key = '<% public_key %>'
  comment = 'Terraformとdbtが使うservice user';
grant role CM_KASAMA_ICEBERG_BI_DEPLOY_ROLE to user CM_KASAMA_ICEBERG_BI_DEPLOY_SVC;
