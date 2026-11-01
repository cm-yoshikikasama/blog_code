# 1つのスキーマのIcebergテーブルを読むだけのロール。Warehouseの権限は付けないので、このロールではWarehouseでクエリを実行できない
resource "snowflake_account_role" "this" {
  name = var.role_name
}

# スキーマのテーブルを参照するには、データベースとスキーマのUSAGEが必要
resource "snowflake_grant_privileges_to_account_role" "database" {
  account_role_name = snowflake_account_role.this.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "DATABASE"
    object_name = var.database_name
  }
}

resource "snowflake_grant_privileges_to_account_role" "schema" {
  account_role_name = snowflake_account_role.this.name
  privileges        = ["USAGE"]

  on_schema {
    schema_name = var.schema_fully_qualified_name
  }
}

# テーブルはapplyのあとにdbtが作る。そのため、これから作られるIcebergテーブルにSELECTを付けるfuture grantにする
resource "snowflake_grant_privileges_to_account_role" "iceberg_tables" {
  account_role_name = snowflake_account_role.this.name
  privileges        = ["SELECT"]

  on_schema_object {
    future {
      object_type_plural = "ICEBERG TABLES"
      in_schema          = var.schema_fully_qualified_name
    }
  }
}
