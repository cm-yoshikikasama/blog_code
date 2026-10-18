# 参照(CTAS)を実行するWarehouse。4構成で共通
resource "snowflake_warehouse" "reference" {
  name                = "CM_KASAMA_COST_BENCH_REFERENCE_WH"
  warehouse_size      = "XSMALL"
  generation          = "2"
  auto_suspend        = 60
  auto_resume         = "true"
  initially_suspended = true
}

# user-managed Task用のWarehouse。サイズごとの課金を分けて測るため、サイズごとに作る
resource "snowflake_warehouse" "user_managed_task" {
  for_each = var.sizes

  name                = "CM_KASAMA_COST_BENCH_USER_MANAGED_TASK_${each.key}_WH"
  warehouse_size      = "XSMALL"
  generation          = "2"
  auto_suspend        = 60
  auto_resume         = "true"
  initially_suspended = true
}
