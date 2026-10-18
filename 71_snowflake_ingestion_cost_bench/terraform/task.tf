locals {
  # COPY INTO の文は2種類のTaskで同じ。違うのは実行する計算資源だけ
  copy_sql = {
    for key, size in local.native_tables : key => <<-SQL
      COPY INTO ${snowflake_table.orders[key].fully_qualified_name}
      FROM @${snowflake_stage_external_s3.s3.fully_qualified_name}/${size}/
      FILE_FORMAT = (FORMAT_NAME = ${snowflake_file_format.csv.fully_qualified_name})
      FORCE = TRUE
    SQL
  }
}

# user-managed Task。サイズごとのWarehouseで実行する
resource "snowflake_task" "user_managed" {
  for_each = var.sizes

  database                        = snowflake_database.bench.name
  schema                          = snowflake_schema.bench.name
  name                            = "USER_MANAGED_TASK_${each.key}"
  warehouse                       = snowflake_warehouse.user_managed_task[each.key].name
  started                         = false
  sql_statement                   = local.copy_sql["USER_MANAGED_ORDERS_${each.key}"]
  task_auto_retry_attempts        = 0
  suspend_task_after_num_failures = 1
}

# serverless Task。Snowflakeが用意する計算資源(XSMALL〜SMALL)で実行する
resource "snowflake_task" "serverless" {
  for_each = var.sizes

  database                                 = snowflake_database.bench.name
  schema                                   = snowflake_schema.bench.name
  name                                     = "SERVERLESS_TASK_${each.key}"
  started                                  = false
  sql_statement                            = local.copy_sql["SERVERLESS_ORDERS_${each.key}"]
  user_task_managed_initial_warehouse_size = "XSMALL"
  serverless_task_min_statement_size       = "XSMALL"
  serverless_task_max_statement_size       = "SMALL"
  task_auto_retry_attempts                 = 0
  suspend_task_after_num_failures          = 1
}
