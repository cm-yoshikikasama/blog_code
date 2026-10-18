resource "snowflake_database" "bench" {
  name = "CM_KASAMA_COST_BENCH_DB"
}

resource "snowflake_schema" "bench" {
  database = snowflake_database.bench.name
  name     = "PUBLIC"
}
