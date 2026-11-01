variable "database_name" {
  description = "Database to create"
  type        = string
}

variable "schemas" {
  description = "Schemas to create in the database"
  type        = list(string)
  default     = []
}

variable "with_managed_access" {
  description = "Whether the schemas use managed access. When true, only the schema owner can grant privileges on objects in the schema"
  type        = bool
  default     = false
}
