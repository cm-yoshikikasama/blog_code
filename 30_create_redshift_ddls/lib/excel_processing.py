import pandas as pd


def extract_from_excel(file: str, env) -> pd.DataFrame:
    """Excelファイルからデータフレームを抽出"""
    df = pd.read_excel(file, sheet_name=env["SHEET_NAME"])
    table_name, schema_name, extracted_data = extract_table_definition(df, env)
    return table_name, schema_name, clean_table(extracted_data)


def extract_table_definition(df, env):
    # ヘッダ行の識別
    header_row = df.iloc[int(env["HEADER_ROW_NUMBER"])]

    col_map = {
        "column_name": env["COLUMN_NAME"],
        "data_type": env["DATA_TYPE"],
        "digits": env["DIGITS"],
        "decimal_part": env["DECIMAL_PART"],
        "primary_key": env["PRIMARY_KEY"],
        "not_null": env["NOT_NULL"],
        "default_value": env["DEFAULT_VALUE"],
    }
    df_data = df.rename(columns=header_row).drop(df.index[: int(env["DELETE_HEADER_ROW_NUMBER"])])
    extracted_data = df_data[[col_map[key] for key in col_map if key in col_map]]
    table_name = df.columns[int(env["TABLE_NAME_LOCATION"])]
    schema_name = df.columns[int(env["SCHEMA_NAME_LOCATION"])]
    # テーブル定義の出力
    return table_name, schema_name, extracted_data


def clean_table(
    df: pd.DataFrame,
) -> pd.DataFrame:
    """データフレームのクリーニング"""
    # データクリーニングを実行
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col].fillna(0, inplace=True)

    # 文字列型のデータの欠損値を"-"に変換します
    df.fillna("-", inplace=True)
    return df
