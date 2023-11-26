def make_column_definition(file_info):
    sql_line = f"    {file_info.column_name:<{file_info.max_column_length}} {file_info.data_type}"

    # Add digits and decimal part if needed
    if file_info.digits != "-":
        if file_info.decimal_part != "-":
            sql_line += f"({int(file_info.digits)},{file_info.decimal_part})"
        else:
            sql_line += f"({int(file_info.digits)})"

    # Add NOT NULL if needed
    if file_info.is_not_null != "-":
        sql_line += " NOT NULL"
    # Add default value if needed
    if file_info.default_value != "-":
        sql_line += f" DEFAULT '{file_info.default_value}'"

    file_info.ddl += sql_line + ",\n"
