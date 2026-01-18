# Diagram MCPでAWS構成図を作成するガイドライン

Python diagramsパッケージを使用してPNG画像を生成する

## 用途の選択

| 方式 | 用途 | メリット |
| ---- | ---- | -------- |
| Mermaid | Markdown埋め込み、テキスト編集 | バージョン管理しやすい |
| Diagram MCP | GitHub表示、画像出力 | AWSアイコン確実に表示 |

## 基本構文

```python
with Diagram("タイトル", show=False, direction="LR"):
    # リソース定義とフロー
```

## レイアウトのベストプラクティス

### Clusterのネストは浅く

悪い例（レイアウト崩れの原因）

```python
# NG: 深いネスト
with Cluster("AWS Cloud"):
    with Cluster("Authentication"):
        with Cluster("Secrets"):
            secrets = SecretsManager("Secrets")
```

良い例

```python
# OK: 1-2階層まで
with Cluster("AWS Cloud"):
    with Cluster("Authentication"):
        secrets = SecretsManager("Secrets")
        role = IAMRole("Role")
```

### メインフローは単一チェーン

悪い例

```python
# NG: 分散した接続定義
a >> b
c >> d
b >> c
```

良い例

```python
# OK: 連続したチェーン
a >> b >> c >> d
```

### IAMロールの配置

同じCluster内に配置するとレイアウトが安定する

```python
with Cluster("AWS Glue Zero ETL"):
    conn = Glue("Connection")
    integ = Glue("Integration")

with Cluster("Data Lake"):
    target_role = IAMRole("Target Role")
    catalog = GlueDataCatalog("Catalog")
    s3 = S3("S3")
```

## 完全な実装例

### シンプルなパイプライン

```python
with Diagram("Data Pipeline", show=False, direction="LR"):
    source = S3("Source")
    glue = Glue("ETL Job")
    target = S3("Target")
    athena = Athena("Query")

    source >> glue >> target >> athena
```

### クラスター付き構成

```python
with Diagram("Salesforce to S3 - AWS Glue Zero ETL", show=False, direction="LR"):
    sf = GenericOfficeBuilding("Salesforce\nOAuth 2.0 JWT Bearer")

    with Cluster("AWS Cloud"):
        with Cluster("Authentication"):
            secrets = SecretsManager("Secrets Manager\n(JWT Token)")
            source_role = IAMRole("Source Role")

        with Cluster("AWS Glue Zero ETL"):
            conn = Glue("Glue Connection\n(Salesforce)")
            integ = Glue("Zero ETL Integration")

        with Cluster("Data Lake"):
            target_role = IAMRole("Target Role")
            catalog = GlueDataCatalog("Glue Data Catalog\n(Iceberg)")
            s3 = S3("S3 Data Lake")

        athena = Athena("Athena")

    # Main flow
    sf >> secrets >> conn >> integ >> catalog >> athena
    catalog - s3
```

## 主要アイコン一覧

### AWS Analytics

| クラス名 | サービス |
| -------- | -------- |
| Athena | Amazon Athena |
| Glue | AWS Glue |
| GlueDataCatalog | Glue Data Catalog |
| Redshift | Amazon Redshift |

### AWS Storage

| クラス名 | サービス |
| -------- | -------- |
| S3 | Amazon S3 |

### AWS Security

| クラス名 | サービス |
| -------- | -------- |
| SecretsManager | Secrets Manager |
| IAMRole | IAM Role |

### AWS Compute

| クラス名 | サービス |
| -------- | -------- |
| Lambda | AWS Lambda |
| ECS | Amazon ECS |
| EKS | Amazon EKS |

### AWS Database

| クラス名 | サービス |
| -------- | -------- |
| RDS | Amazon RDS |
| DynamoDB | Amazon DynamoDB |
| Aurora | Amazon Aurora |

### AWS Integration

| クラス名 | サービス |
| -------- | -------- |
| Eventbridge | Amazon EventBridge |
| SQS | Amazon SQS |
| SNS | Amazon SNS |
| StepFunctions | AWS Step Functions |

### 外部サービス

| クラス名 | 用途 |
| -------- | ---- |
| GenericOfficeBuilding | 外部システム（Salesforce等） |
| User | ユーザー |
| Users | 複数ユーザー |

## 接続の種類

```python
# 実線矢印（データフロー）
a >> b

# 双方向
a - b

# ラベル付き
a >> Edge(label="transform") >> b

# 破線（関連を示す）
a >> Edge(style="dashed") >> b

# 色付き
a >> Edge(color="red") >> b
```

## トラブルシューティング

### レイアウトが崩れる

原因: Clusterのネストが深すぎる

対策: 2階層以内に抑える

### 図が生成されない

原因: 構文エラー（ラベル内の特殊文字等）

対策: ラベルをシンプルにして段階的に追加

### ノードが期待した位置にない

原因: Graphvizの自動レイアウト

対策: 同じCluster内に関連ノードをまとめる

## ファイル出力

必ずプロジェクトディレクトリを `workspace_dir` に指定する

```python
# MCP呼び出し時
workspace_dir = "/path/to/project"  # 例: 59_salesforce_glue_zeroetl
filename = "architecture"
```

生成先: `(project)/generated-diagrams/architecture.png`

出力ルール

- workspace_dir: 対象プロジェクトのディレクトリを指定（必須）
- filename: 拡張子なしのファイル名
- ルートディレクトリには絶対に生成しない
- 試行錯誤中も同じファイル名で上書きする（test-1, test-2のような連番禁止）
- 完成後、不要な画像があればユーザーに削除コマンドを提示する
