# データベースと、その中に作るスキーマ
resource "snowflake_database" "this" {
  name = var.database_name
}

resource "snowflake_schema" "this" {
  for_each = toset(var.schemas)

  database = snowflake_database.this.name
  name     = each.key
  # managed accessのスキーマでは、スキーマのownerがMANAGE GRANTSなしでfuture grantを付けられる
  with_managed_access = var.with_managed_access ? "true" : "false"
}
