variable "database_name" {
  description = "作成するデータベース"
  type        = string
}

variable "schemas" {
  description = "データベースに作成するスキーマ"
  type        = list(string)
  default     = []
}

variable "with_managed_access" {
  description = "スキーマをmanaged accessにするか。trueにすると、スキーマ内のオブジェクトへの権限はスキーマのownerだけが付けられる"
  type        = bool
  default     = false
}
