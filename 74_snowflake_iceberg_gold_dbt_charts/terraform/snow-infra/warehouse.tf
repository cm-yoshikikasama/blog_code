# Warehouse for dbt to build seeds and gold. Not used to read the dashboard data
module "warehouse" {
  source = "../modules/snow/warehouse"

  warehouse_name = "CM_KASAMA_ICEBERG_BI_DBT_WH"
}
