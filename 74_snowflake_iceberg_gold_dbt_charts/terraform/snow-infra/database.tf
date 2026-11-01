module "database" {
  source = "../modules/snow/database"

  database_name = "CM_KASAMA_ICEBERG_BI_DB"
  # SEEDはdbt seedがCSVを読み込むテーブル、GOLDはdbtが作るIcebergテーブル
  schemas = ["SEED", "GOLD"]
  # Terraformのロールがスキーマのownerとして、MANAGE GRANTSなしでfuture grantを付けるため
  with_managed_access = true

  # destroyでgoldのIcebergテーブル(データベースごと)を消してから、External Volumeを消す
  depends_on = [module.external_volume]
}
