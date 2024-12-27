import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import glob
import os

# 出力ディレクトリを作成
output_dir = "parquet"
os.makedirs(output_dir, exist_ok=True)

# 入力ディレクトリの全CSVファイルを処理
for csv_file in glob.glob("csv/*.csv"):
    # すべてのカラムを文字列型として読み込む
    df = pd.read_csv(csv_file, dtype=str)
    table = pa.Table.from_pandas(df)

    # 出力ファイル名を生成
    output_file = os.path.join(
        output_dir, os.path.basename(csv_file).replace(".csv", ".parquet")
    )

    pq.write_table(table, output_file)
    print(f"Converted {csv_file} to {output_file}")
