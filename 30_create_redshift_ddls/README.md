# Create Redshift DDL

## 概要

- table定義書からddlを作成します。

## 実装要件

- 対応データ型: 主にRedshiftで現状使用しているデータ型に対応
  - https://docs.aws.amazon.com/ja_jp/redshift/latest/dg/c_Supported_data_types.html
  - 以下の一覧のデータ型以外は対応しておりませんので、例えば、以下の変換が必要になります。
    - NUMERIC → DECIMAL

```text
SMALLINT
INTEGER
BIGINT
DECIMAL
REAL
DOUBLE PRECISION
BOOLEAN
CHAR
VARCHAR
DATE
TIMESTAMP
TIMESTAMPTZ
GEOMETRY
GEOGRAPHY
HLLSKETCH
SUPER
TIME
TIMETZ
VARBYTE
```

- データ型:
  - if not null
    - if primary key
  - if null
- データ型の対応がない場合は:
  - warning

## テスト

- 全てのデータ型
- 不正な仕様書
- 不正な桁数
- 予期せぬ値
- 値に空白


## 条件

- requirements.txtのライブラリをインストールします。
- ddlを作成したいtable定義書をinputフォルダに格納します。
- table定義書の形式は`正常系table定義.xlsx`と同一であることを想定しています。

```text
pip install -r requirements.txt
```

## 実行

```text
python main.py
```

## 出力結果

- 生成したddlはouputフォルダに出力されます。