import findspark

# .init()で$SPARK_HOMEのパスを自動的に読み込む
findspark.init()

# pysparkに必要なライブラリを読み込む
from pyspark.sql import SparkSession  # noqa: E402
from pyspark.sql.types import StringType, StructField, StructType  # noqa: E402

# spark sessionの作成
spark = (
    SparkSession.builder.appName("test")
    .config("hive.exec.dynamic.partition", "true")
    .config("hive.exec.dynamic.partition.mode", "nonstrict")
    .config("spark.sql.session.timeZone", "JST")
    .config("spark.ui.enabled", "true")
    .config("spark.eventLog.enabled", "true")
    .enableHiveSupport()
    .getOrCreate()
)

# csvデータ読み込み
struct = StructType(
    [
        StructField("test_column_A", StringType(), False),
        StructField("test_column_B", StringType(), False),
    ]
)
df_csv = (
    spark.read.option("multiline", "true")
    .option("encoding", "UTF-8")
    .csv("test.csv", header=False, sep=",", inferSchema=False, schema=struct)
)
df_csv.show()

spark.stop()
spark.sparkContext.stop()
