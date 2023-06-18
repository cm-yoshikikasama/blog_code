# Excelに自動で画像を貼り付けるPython処理

## 背景

既存のExcelファイルにシートを新たに追加し、画像を貼り付けるPython処理


## ライブラリインストール

```text
pip install openpyxl
```

## 実行方法

事前に以下の準備が必要です。

- 新たにシートを格納して画像を貼り付けるためのExcelファイル
- 画像を格納するためのフォルダ
  - 複数ある場合は昇順ソートされるため、先頭を数字にすることをお勧めします。
- 貼り付ける対象となる画像
  - 画像も昇順ソートされるため、過去から未来に向かって並ぶ順序になります。


```text

├── 1_前提条件
│   ├── Screenshot 2023-06-17 at 7.48.04.png
│   └── Screenshot 2023-06-17 at 7.48.09.png
├── 2_試験結果
│   ├── Screenshot 2023-06-17 at 7.48.14.png
│   └── Screenshot 2023-06-17 at 7.48.20.png
├── README.md
├── image_to_excel.py
├── requirements.txt
└── test_evidence.xlsx

2 directories, 8 files
```

実行例

```text
(blog_env) kasama.yoshiki@ 22_image_to_excel % python image_to_excel.py test_evidence.xlsx No.2
test_evidence.xlsx
Insert Images to Excel
(blog_env) kasama.yoshiki@ 22_image_to_excel % 
```

help

```text
(blog_env) kasama.yoshiki@ 22_image_to_excel % python image_to_excel.py --help
usage: image_to_excel.py [-h] excel_file_name sheet_name

positional arguments:
  excel_file_name  使用する既存のExcelファイル名
  sheet_name       作成するシート名

options:
  -h, --help       show this help message and exit
(blog_env) kasama.yoshiki@ 22_image_to_excel % 
```
