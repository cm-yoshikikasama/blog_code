module "database" {
  source = "../modules/snow/database"

  database_name = "CM_KASAMA_ICEBERG_BI_DB"
  # SEED holds the tables loaded by dbt seed, GOLD holds the Iceberg tables built by dbt
  schemas = ["SEED", "GOLD"]
  # So that the Terraform role, as schema owner, can add future grants without MANAGE GRANTS
  with_managed_access = true

  # On destroy, drop the gold Iceberg tables (with the database) before the external volume
  depends_on = [module.external_volume]
}
