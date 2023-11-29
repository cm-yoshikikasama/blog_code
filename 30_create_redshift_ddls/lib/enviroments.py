import os


def get_env():
    # Excelシート名
    os.environ["SHEET_NAME"] = os.environ.get("SHEET_NAME", "table定義")
    # カラム名の列名
    os.environ["COLUMN_NAME"] = os.environ.get("COLUMN_NAME", "カラム名（物理）")
    # データ型の列名
    os.environ["DATA_TYPE"] = os.environ.get("DATA_TYPE", "データ型")
    # 桁数の列名
    os.environ["DIGITS"] = os.environ.get("DIGITS", "桁数")
    # 小数点以下桁数の列名
    os.environ["DECIMAL_PART"] = os.environ.get("DECIMAL_PART", "小数点以下桁数")
    # 主キーの列名
    os.environ["PRIMARY_KEY"] = os.environ.get("PRIMARY_KEY", "PRIMARY KEY")
    # Not NULL制約の列名
    os.environ["NOT_NULL"] = os.environ.get("NOT_NULL", "NOT NULL")
    # デフォルト値の列名
    os.environ["DEFAULT_VALUE"] = os.environ.get("DEFAULT_VALUE", "デフォルト値")
    # table nameが格納されている列番号
    os.environ["TABLE_NAME_LOCATION"] = os.environ.get("TABLE_NAME_LOCATION", "1")
    # schema nameが格納されている列番号
    os.environ["SCHEMA_NAME_LOCATION"] = os.environ.get("SCHEMA_NAME_LOCATION", "5")

    os.environ["REDSHIFT_DATA_TYPES"] = ",".join(
        [
            "SMALLINT",
            "INTEGER",
            "BIGINT",
            "DECIMAL",
            "REAL",
            "DOUBLE PRECISION",
            "BOOLEAN",
            "CHAR",
            "VARCHAR",
            "DATE",
            "TIMESTAMP",
            "TIMESTAMPTZ",
            "GEOMETRY",
            "GEOGRAPHY",
            "HLLSKETCH",
            "SUPER",
            "TIME",
            "TIMETZ",
            "VARBYTE",
        ]
    )
    return os.environ
