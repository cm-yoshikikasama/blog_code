variable "role_name" {
  description = "Role to create"
  type        = string
}

variable "database_name" {
  description = "Database to read"
  type        = string
}

variable "schema_fully_qualified_name" {
  description = "Fully qualified name of the schema to read"
  type        = string
}
