class TableInfo:
    def __init__(self, ddl, max_column_length):
        self.__ddl = ddl
        self.__data_type = ""
        self.__digits = ""
        self.__is_not_null = ""
        self.__column_name = ""
        self.__max_column_length = max_column_length
        self.__decimal_part = 0
        self.__primary_key = ""
        self.__default_value = ""

        self.__primary_key_list = []

    # gettter method
    @property
    def ddl(self):
        return self.__ddl

    @property
    def data_type(self):
        return self.__data_type

    @property
    def digits(self):
        return self.__digits

    @property
    def is_not_null(self):
        return self.__is_not_null

    @property
    def column_name(self):
        return self.__column_name

    @property
    def max_column_length(self):
        return self.__max_column_length

    @property
    def decimal_part(self):
        return self.__decimal_part

    @property
    def primary_key(self):
        return self.__primary_key

    @property
    def primary_key_list(self):
        return self.__primary_key_list

    @property
    def default_value(self):
        return self.__default_value

    # setter method
    @ddl.setter
    def ddl(self, ddl):
        self.__ddl = ddl

    @data_type.setter
    def data_type(self, data_type):
        self.__data_type = data_type

    @digits.setter
    def digits(self, digits):
        self.__digits = digits

    @is_not_null.setter
    def is_not_null(self, is_not_null):
        self.__is_not_null = is_not_null

    @column_name.setter
    def column_name(self, column_name):
        self.__column_name = column_name

    @max_column_length.setter
    def max_column_length(self, max_column_length):
        self.__max_column_length = max_column_length

    @decimal_part.setter
    def decimal_part(self, decimal_part):
        self.__decimal_part = decimal_part

    @primary_key.setter
    def primary_key(self, primary_key):
        self.__primary_key = primary_key

    @primary_key_list.setter
    def primary_key_list(self, primary_key_list):
        self.__primary_key_list.append(primary_key_list)

    @default_value.setter
    def default_value(self, default_value):
        self.__default_value = default_value
