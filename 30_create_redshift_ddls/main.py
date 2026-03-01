import glob
import traceback
import warnings

from lib.environments import get_env
from lib.excel_processing import (
    extract_schema_table_name_from_excel,
    extract_table_data_from_excel,
)
from lib.sql_processing import make_column_definition
from lib.table_info import TableInfo

# Excelファイルにデータ検証(Data Validation)の拡張が含まれているけど、
# その拡張は openpyxl ライブラリでサポートされていないという意味です。
# そのため、読み込むExcelファイルがこの拡張を必要としない場合には問題ありません。
warnings.filterwarnings(
    "ignore", message="Data Validation extension is not supported and will be removed"
)


def write_to_file(s_name: str, t_name: str, ddl: str) -> None:
    """ "SQL文をファイルに書き込み"""
    with open(f"./output/{s_name}.{t_name}.sql", "w", encoding="utf-8") as file:
        file.write(ddl)


def main():
    try:
        env = get_env()
        files = [file for file in glob.glob("./input/*.xlsx") if "~$" not in file]
        if not files:
            raise ValueError("file did not exist.")
        print("files:", files)
        for file in files:
            schema_name, table_name = extract_schema_table_name_from_excel(file, env)
            extract_table_data = extract_table_data_from_excel(file, env)
            column_lengths = extract_table_data[env["COLUMN_NAME"]].apply(
                lambda x: len(str(x))
            )
            max_column_length = max(column_lengths)
            ddl = f"CREATE TABLE IF NOT EXISTS {schema_name}.{table_name}(\n"
            table_info = TableInfo(ddl, max_column_length)
            for _, row in extract_table_data.iterrows():
                table_info.column_name = row[env["COLUMN_NAME"]]
                table_info.data_type = row[env["DATA_TYPE"]]
                table_info.digits = row[env["DIGITS"]]
                table_info.decimal_part = row[env["DECIMAL_PART"]]
                table_info.primary_key = row[env["PRIMARY_KEY"]]
                table_info.is_not_null = row[env["NOT_NULL"]]
                table_info.default_value = row[env["DEFAULT_VALUE"]]
                # 全て含む場合
                if {
                    table_info.column_name,
                    table_info.decimal_part,
                    table_info.data_type,
                    table_info.digits,
                    table_info.primary_key,
                    table_info.default_value,
                } == {"-"}:
                    continue
                elif table_info.data_type in env["REDSHIFT_DATA_TYPES"].split(","):
                    if table_info.primary_key != "-":
                        table_info.primary_key_list = table_info.column_name
                    make_column_definition(table_info)
                else:
                    print("error record:", vars(table_info))
                    raise ValueError(
                        "There is no data type. Tracking your"
                        " self or  ask the administorator"
                    )
            if table_info.primary_key_list != []:
                table_info.ddl += (
                    "    PRIMARY KEY (" + ", ".join(table_info.primary_key_list) + ")\n"
                )
            table_info.ddl = (
                table_info.ddl.rstrip(",\n") + "\n)\nDISTSTYLE AUTO\nSORTKEY AUTO;"
            )
            write_to_file(schema_name, table_name, table_info.ddl)
        print("successfull")
    except Exception:
        print("error file:", file)
        traceback.print_exc()


if __name__ == "__main__":
    main()
