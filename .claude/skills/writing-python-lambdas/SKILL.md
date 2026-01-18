---
name: writing-python-lambdas
description: Provides Python Lambda implementation patterns with type hints, boto3 client initialization optimization, and proper error handling. Use when creating or modifying Python Lambda code, implementing AWS Lambda handlers, or working with boto3 clients.
---

# Python Lambda実装

PythonでAWS Lambda関数を実装するためのガイドです。

## 基本的なLambda handler

```python
import json
from typing import Any

def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """Lambda handler"""
    try:
        # メイン処理
        result = process(event)

        return {
            "statusCode": 200,
            "body": json.dumps({"result": result})
        }
    except Exception as e:
        print(f"Lambda failed: {str(e)}")
        raise
```

## 実装ワークフロー

以下のチェックリストに従って実装を進める

```text
進捗:
- [ ] Step 1: handler構造を作成
- [ ] Step 2: すべての関数に型ヒントを追加
- [ ] Step 3: boto3クライアントをグローバルスコープで初期化
- [ ] Step 4: try-except-raiseでエラーハンドリングを実装
- [ ] Step 5: ログ出力を追加
- [ ] Step 6: コーディング規約と照合
```

### Step 1: handler構造を作成

上記の基本テンプレートを基盤として使用。

### Step 2: 型ヒントを追加

すべての関数に型ヒントが必須。必要なimport

```python
from typing import Any, Dict, List, Optional
```

### Step 3: boto3クライアントを初期化

Lambdaウォームスタート最適化のため、クライアント初期化をグローバルスコープに移動

```python
# Good - グローバルスコープ
s3_client = boto3.client('s3')

def lambda_handler(event, context):
    s3_client.get_object(...)
```

詳細は [coding-conventions.md](coding-conventions.md) を参照。

### Step 4: エラーハンドリングを実装

常にtry-exceptと再raiseパターンを使用

```python
try:
    # メイン処理
except Exception as e:
    print(f"Lambda failed: {str(e)}")
    raise  # CloudWatch Logsのために再raise必須
```

### Step 5: ログ出力を追加

明確なフォーマットでprint文を使用

```python
print("Lambda started")
print(f"Processing: {item_count:,} items")
print("Lambda completed")
```

### Step 6: コーディング規約と照合

[coding-conventions.md](coding-conventions.md) と照合してコンプライアンスを確認。

## 詳細ガイド

[coding-conventions.md](coding-conventions.md) - コーディング規約、実装例
