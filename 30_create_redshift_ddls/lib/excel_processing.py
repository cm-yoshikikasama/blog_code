import pandas as pd


def extract_schema_table_name_from_excel(file: str, env):
    """Excelファイルからtable_name,schema_nameを抽出"""
    header_df = pd.read_excel(file, sheet_name=env["SHEET_NAME"], nrows=0)
    schema_name = header_df.columns[int(env["SCHEMA_NAME_LOCATION"])]
    table_name = header_df.columns[int(env["TABLE_NAME_LOCATION"])]
    return schema_name, table_name


def extract_table_data_from_excel(file: str, env) -> pd.DataFrame:
    """Excelファイルからデータフレームを抽出"""
    extract_df = pd.read_excel(file, sheet_name=env["SHEET_NAME"], header=2, dtype=str)
    col_map = {
        "column_name": env["COLUMN_NAME"],
        "data_type": env["DATA_TYPE"],
        "digits": env["DIGITS"],
        "decimal_part": env["DECIMAL_PART"],
        "primary_key": env["PRIMARY_KEY"],
        "not_null": env["NOT_NULL"],
        "default_value": env["DEFAULT_VALUE"],
    }
    extracted_data = extract_df[[col_map[key] for key in col_map if key in col_map]]
    return clean_table(extracted_data)


def clean_table(
    df: pd.DataFrame,
) -> pd.DataFrame:
    """データフレームのクリーニング"""
    # 文字列型のデータの欠損値を"-"に変換します
    return df.fillna("-")
