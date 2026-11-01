variable "role_name" {
  description = "作成するロール"
  type        = string
}

variable "database_name" {
  description = "読み取り対象のデータベース"
  type        = string
}

variable "schema_fully_qualified_name" {
  description = "読み取り対象のスキーマの完全修飾名"
  type        = string
}
