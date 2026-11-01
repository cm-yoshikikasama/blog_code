variable "warehouse_name" {
  description = "作成するWarehouse"
  type        = string
}

variable "warehouse_size" {
  description = "Warehouseのサイズ"
  type        = string
  default     = "XSMALL"
}
