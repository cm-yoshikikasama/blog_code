import pandas as pd
import numpy as np

# usersデータ（異常値・型揺らぎあり）
users_data = {
    "user_id": [1, 2, 3, 4, 5, 6],
    "name": ["Alice", "Bob", None, "Eve", "Mallory", "Oscar"],
    "age": [25, "thirty", 40.5, None, 28, 22],
    "is_active": [True, False, "yes", None, False, True],
    "signup_date": [
        "2023-01-01",
        "2023-02-15",
        None,
        "not_a_date",
        "2023-05-20",
        "2023-06-01",
    ],
    "comment": ["Good", None, "Bad", "Average", "", "Excellent"],
    "extra_col": [np.nan, 123, "text", True, 0.5, None],
}
users_df = pd.DataFrame(users_data)
users_df["age"] = users_df["age"].astype(str)
users_df["is_active"] = users_df["is_active"].astype(str)
users_df["extra_col"] = users_df["extra_col"].astype(str)
users_df.to_parquet("users.parquet", engine="pyarrow")
print("users.parquet 作成完了")

# ordersデータ（正常値のみ）
orders_data = {
    "order_id": [101, 102, 103, 104, 105, 106],
    "user_id": [1, 2, 1, 4, 5, 6],  # usersに存在するuser_idのみ
    "amount": [120.5, 90.0, 30.0, 200.0, 50.0, 60.0],  # floatのみ
    "order_date": [
        "2024-03-01",
        "2024-03-02",
        "2024-03-05",
        "2024-03-10",
        "2024-03-11",
        "2024-03-12",
    ],
    "status": ["completed", "cancelled", "completed", "completed", "completed", "completed"],
    "coupon_used": [True, False, False, False, True, False],
    "extra_info": ["", "gift", "", "", "", ""],
}
orders_df = pd.DataFrame(orders_data)
orders_df.to_parquet("orders.parquet", engine="pyarrow")
print("orders.parquet 作成完了")
