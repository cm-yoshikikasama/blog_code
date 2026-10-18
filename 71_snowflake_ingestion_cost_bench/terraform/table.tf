locals {
  # 注文データの9列。外部テーブルではCSVのc1〜c9をこの型で読む
  order_columns = [
    { name = "ORDER_ID", type = "NUMBER" },
    { name = "CUSTOMER_ID", type = "NUMBER" },
    { name = "ORDER_STATUS", type = "VARCHAR" },
    { name = "TOTAL_PRICE", type = "NUMBER(12,2)" },
    { name = "ORDER_DATE", type = "DATE" },
    { name = "ORDER_PRIORITY", type = "VARCHAR" },
    { name = "CLERK", type = "VARCHAR" },
    { name = "SHIP_PRIORITY", type = "NUMBER" },
    { name = "ORDER_COMMENT", type = "VARCHAR" },
  ]

  # 取り込み先のテーブル。構成ごと・サイズごとに1つ
  native_tables = {
    for pair in setproduct(["USER_MANAGED", "SERVERLESS", "SNOWPIPE"], var.sizes) :
    "${pair[0]}_ORDERS_${pair[1]}" => pair[1]
  }
}

# 外部テーブル。データは持たず、参照のたびにS3の cost-bench/<サイズ>/ を読む
resource "snowflake_external_table" "orders" {
  for_each = var.sizes

  database          = snowflake_database.bench.name
  schema            = snowflake_schema.bench.name
  name              = "EXTERNAL_ORDERS_${each.key}"
  location          = "@${snowflake_stage_external_s3.s3.fully_qualified_name}/${each.key}/"
  file_format       = "FORMAT_NAME = ${snowflake_file_format.csv.fully_qualified_name}"
  auto_refresh      = false
  refresh_on_create = false

  dynamic "column" {
    for_each = { for i, c in local.order_columns : i => c }
    content {
      name = column.value.name
      type = column.value.type
      as   = "(value:c${column.key + 1}::${column.value.type})"
    }
  }
}

# Task・Snowpipeで取り込むテーブル
resource "snowflake_table" "orders" {
  for_each = local.native_tables

  database = snowflake_database.bench.name
  schema   = snowflake_schema.bench.name
  name     = each.key

  dynamic "column" {
    for_each = local.order_columns
    content {
      name = column.value.name
      type = column.value.type
    }
  }
}
