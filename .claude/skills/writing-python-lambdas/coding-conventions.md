# Python Lambda コーディング規約

既存実装（iceberg_copy.py）から抽出した詳細なコーディング規約。

## 目次

- インポート順序
- 関数定義とdocstring
- 変数名の命名規則
- コメントスタイル
- ログ出力
- エラーハンドリング
- 早期リターンパターン
- レスポンス形式
- SQLクエリのフォーマット
- DuckDB設定
- boto3クライアント使用
- リソースクリーンアップ
- テストパターン
  - 基本的なテスト構造
  - モックの使用
  - 環境変数のモック
  - エラーケースのテスト
  - パラメータ化テスト
  - フィクスチャの使用

## インポート順序

```python
# 1. 標準ライブラリ（アルファベット順）
import json
import os

# 2. サードパーティライブラリ（アルファベット順）
import boto3
import duckdb
```

## 関数定義とdocstring

```python
def lambda_handler(event, _context):
    """
    Lambda handler for cross-account Iceberg data copy using DuckDB
    """
```

ルール:

- 1行docstringで関数の目的を簡潔に記述
- 使用しない引数は `_` プレフィックス

## 変数名の命名規則

```python
# スネークケース使用
source_bucket = os.environ["SOURCE_BUCKET"]
source_prefix = os.environ["SOURCE_PREFIX"]
target_database = os.environ["TARGET_DATABASE"]
target_table = os.environ["TARGET_TABLE"]

target_date = event["TARGET_DATE"]

# パス構築にはf-string使用
source_path = (
    f"s3://{source_bucket}/{source_prefix}/sample_data_{target_date}.csv"
)

table_identifier = f"glue_catalog.{target_database}.{target_table}"
```

## コメントスタイル

処理ブロックの前に目的を記述:

```python
# パラメータ取得（環境変数から）
source_bucket = os.environ["SOURCE_BUCKET"]

# パラメータ取得（実行時入力から）
target_date = event["TARGET_DATE"]

# DuckDB初期化
con = duckdb.connect(":memory:")

# AWS認証情報を設定
con.execute("""...""")

# S3 データ読み取り
source_path = f"..."

# CSVを読み取り、updated_atカラムを追加
query = f"""..."""

# Glue カタログ接続（アカウントIDを使用）
account_id = boto3.client("sts").get_caller_identity()["Account"]

# Iceberg テーブルに対する処理
table_identifier = f"glue_catalog.{target_database}.{target_table}"

# 既存のデータを削除（重複防止）
delete_query = f"DELETE FROM {table_identifier} WHERE date = '{target_date}'"

# データを insert
print(f"Inserting into {table_identifier}...")
```

## ログ出力

```python
# 処理開始
print("Lambda started")
print(f"Target: {target_database}.{target_table} (date={target_date})")

# 処理中
print("DuckDB初期化完了")
print("S3 SECRET作成完了")
print(f"Reading: {source_path}")
print(f"Rows read: {row_count:,}")
print(f"Glue カタログ接続完了: Account={account_id}")
print(f"Deleting existing data for date={target_date}...")
print("DELETE完了")
print(f"Inserting into {table_identifier}...")
print("INSERT完了")

# 処理完了
print(f"Lambda completed: {row_count:,} rows inserted")
```

ルール:

- 処理開始: `"Lambda started"`
- 処理完了: `"〜完了"` または `"Lambda completed"`
- 数値: カンマ区切り (`:,`)
- 変数表示: f-string使用

## エラーハンドリング

```python
try:
    # メイン処理
    pass

except Exception as e:
    error_message = f"Lambda failed: {str(e)}"
    print(error_message)
    raise  # 再スロー必須
```

ルール:

- エラーメッセージを変数化
- printで出力
- 必ず再スロー（CloudWatch Logsに記録）

## 早期リターンパターン

```python
if row_count == 0:
    print("No data found")
    con.close()
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "No data found", "rows_inserted": 0}),
    }
```

## レスポンス形式

```python
return {
    "statusCode": 200,
    "body": json.dumps(
        {
            "message": "Data copy completed successfully",
            "rows_inserted": row_count,
            "target_table": f"{target_database}.{target_table}",
            "target_date": target_date,
        }
    ),
}
```

ルール:

- statusCode + body形式
- bodyはjson.dumps()でシリアライズ
- 処理結果の詳細を含める

## SQLクエリのフォーマット

```python
# 複数行クエリはトリプルクォート + インデント
query = f"""
    SELECT
        *,
        CURRENT_TIMESTAMP AS updated_at
    FROM read_csv_auto('{source_path}')
"""

con.execute("""
    CREATE SECRET (
        TYPE S3,
        PROVIDER CREDENTIAL_CHAIN
    );
""")

con.execute(
    f"""
    ATTACH '{account_id}' AS glue_catalog (
        TYPE iceberg,
        ENDPOINT_TYPE 'glue'
    );
"""
)

# 単一行クエリはf-stringで
delete_query = f"DELETE FROM {table_identifier} WHERE date = '{target_date}'"
con.execute(f"INSERT INTO {table_identifier} SELECT * FROM df")
```

## DuckDB設定

```python
con = duckdb.connect(":memory:")
con.execute("SET home_directory='/tmp';")
con.execute("SET extension_directory='/tmp/duckdb_extensions';")
```

## boto3クライアント使用

```python
account_id = boto3.client("sts").get_caller_identity()["Account"]
```

## リソースクリーンアップ

```python
con.close()
```

## テストパターン

### 基本的なテスト構造

```python
from typing import Dict, Any
from unittest.mock import Mock, patch
import pytest

def test_lambda_handler_success() -> None:
    """正常系のテスト"""
    event: Dict[str, Any] = {"TARGET_DATE": "2024-01-01"}
    context: Mock = Mock()

    result = lambda_handler(event, context)

    assert result["statusCode"] == 200
    assert "rows_inserted" in result["body"]
```

### モックの使用

boto3クライアントや外部サービスは必ずモック化する

```python
@patch("boto3.client")
def test_lambda_handler_with_mock(mock_boto_client: Mock) -> None:
    """boto3クライアントをモック化"""
    # STSクライアントのモック設定
    mock_sts = Mock()
    mock_sts.get_caller_identity.return_value = {"Account": "123456789012"}
    mock_boto_client.return_value = mock_sts

    event: Dict[str, Any] = {"TARGET_DATE": "2024-01-01"}
    context: Mock = Mock()

    result = lambda_handler(event, context)

    assert result["statusCode"] == 200
    mock_sts.get_caller_identity.assert_called_once()
```

### 環境変数のモック

```python
@patch.dict(os.environ, {
    "SOURCE_BUCKET": "test-bucket",
    "SOURCE_PREFIX": "test-prefix",
    "TARGET_DATABASE": "test_db",
    "TARGET_TABLE": "test_table"
})
def test_lambda_handler_with_env() -> None:
    """環境変数をモック化"""
    event: Dict[str, Any] = {"TARGET_DATE": "2024-01-01"}
    context: Mock = Mock()

    # テスト実行
    result = lambda_handler(event, context)

    assert result["statusCode"] == 200
```

### エラーケースのテスト

```python
def test_lambda_handler_missing_parameter() -> None:
    """必須パラメータが欠けている場合"""
    event: Dict[str, Any] = {}
    context: Mock = Mock()

    with pytest.raises(KeyError):
        lambda_handler(event, context)

@patch("duckdb.connect")
def test_lambda_handler_duckdb_error(mock_connect: Mock) -> None:
    """DuckDB接続エラー"""
    mock_connect.side_effect = Exception("Connection failed")

    event: Dict[str, Any] = {"TARGET_DATE": "2024-01-01"}
    context: Mock = Mock()

    with pytest.raises(Exception) as exc_info:
        lambda_handler(event, context)

    assert "Connection failed" in str(exc_info.value)
```

### パラメータ化テスト

```python
@pytest.mark.parametrize("target_date,expected", [
    ("2024-01-01", "2024-01-01"),
    ("2024-12-31", "2024-12-31"),
])
def test_lambda_handler_multiple_dates(target_date: str, expected: str) -> None:
    """複数の日付パターンをテスト"""
    event: Dict[str, Any] = {"TARGET_DATE": target_date}
    context: Mock = Mock()

    result = lambda_handler(event, context)

    assert expected in result["body"]
```

### フィクスチャの使用

```python
@pytest.fixture
def mock_event() -> Dict[str, Any]:
    """テスト用イベントデータ"""
    return {"TARGET_DATE": "2024-01-01"}

@pytest.fixture
def mock_context() -> Mock:
    """テスト用Lambdaコンテキスト"""
    return Mock()

def test_with_fixtures(mock_event: Dict[str, Any], mock_context: Mock) -> None:
    """フィクスチャを使用したテスト"""
    result = lambda_handler(mock_event, mock_context)
    assert result["statusCode"] == 200
```
