output "database_name" {
  description = "Database name"
  value       = snowflake_database.this.name
}

output "schema_fully_qualified_names" {
  description = "Map of fully qualified schema names (key = schema name)"
  value       = { for k, s in snowflake_schema.this : k => s.fully_qualified_name }
}
