---
name: creating-aws-diagrams
description: Creates AWS architecture diagrams using Mermaid flowchart with official AWS icons, clickable nodes, and proper layout. Use when creating or updating AWS infrastructure diagrams, visualizing CDK stacks, or documenting system architecture.
---

# AWS構成図作成

AWS構成図を作成するための2つの方式

## 方式の選択

| 方式 | 用途 | メリット |
| ---- | ---- | -------- |
| Mermaid | Markdown埋め込み、テキスト編集 | バージョン管理しやすい、編集が容易 |
| Diagram MCP | GitHub表示、画像出力 | AWSアイコン確実に表示、レイアウト安定 |

指定がなければMermaidを使用

## Mermaid

AWS公式アイコンを使用（Iconify API）

```mermaid
flowchart LR
lambda@{img: "https://api.iconify.design/logos/aws-lambda.svg",label: "lambda:<br>function-name",pos: "b",w: 60,h: 60,constraint: "on"}
```

ノードID規則

| サービス | ノードID           |
| -------- | ------------------ |
| Lambda   | function-name      |
| S3       | bucket-name        |
| ELB      | load-balancer-name |
| EC2      | instance-id        |
| ECS      | cluster/service    |
| RDS      | db-cluster-id      |

詳細: [mermaid-guide.md](mermaid-guide.md)

## Diagram MCP

Python diagramsパッケージでPNG画像を生成

```python
with Diagram("タイトル", show=False, direction="LR"):
    s3 = S3("Source")
    glue = Glue("ETL")
    athena = Athena("Query")
    s3 >> glue >> athena
```

レイアウトのポイント

- Clusterのネストは2階層以内
- メインフローは単一チェーン接続
- IAMロールは関連Cluster内に配置

詳細: [diagram-mcp-guide.md](diagram-mcp-guide.md)
