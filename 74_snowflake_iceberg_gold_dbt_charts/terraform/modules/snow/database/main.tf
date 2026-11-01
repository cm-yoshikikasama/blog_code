# Database and its schemas
resource "snowflake_database" "this" {
  name = var.database_name
}

resource "snowflake_schema" "this" {
  for_each = toset(var.schemas)

  database = snowflake_database.this.name
  name     = each.key
  # In a managed access schema, the schema owner can add future grants without MANAGE GRANTS
  with_managed_access = var.with_managed_access ? "true" : "false"
}
