output "database_name" {
  description = "データベース名"
  value       = snowflake_database.this.name
}

output "schema_fully_qualified_names" {
  description = "スキーマの完全修飾名のマップ(key = スキーマ名)"
  value       = { for k, s in snowflake_schema.this : k => s.fully_qualified_name }
}
