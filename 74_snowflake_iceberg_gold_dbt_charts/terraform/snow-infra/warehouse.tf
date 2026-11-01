# dbtでseedとgoldを作るWarehouse。ダッシュボードの参照には使わない
module "warehouse" {
  source = "../modules/snow/warehouse"

  warehouse_name = "CM_KASAMA_ICEBERG_BI_DBT_WH"
}
