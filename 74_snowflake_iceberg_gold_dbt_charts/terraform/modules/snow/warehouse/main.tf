# Warehouse。使わないときは60秒で停止する
resource "snowflake_warehouse" "this" {
  name                = var.warehouse_name
  warehouse_size      = var.warehouse_size
  generation          = "2"
  auto_suspend        = 60
  auto_resume         = "true"
  initially_suspended = true
}
