# README: MCP Server × DuckDB × Cursor × dbt で異常値入り Parquet データを活用した AI データパイプライン構築

この README は、**異常値を含む`users_abnormal.parquet`と正常な`orders_normal.parquet`を使い、MCP Server（DuckDB）と Cursor を組み合わせて、AI が dbt モデルを自律的に生成・検証・整備する手順**をまとめたものです。  
MotherDuck 公式ブログ「Close the Loop: Faster Data Pipelines with MCP, DuckDB & AI」の実践ガイドを、ローカル Parquet データに合わせて再構成しています。

---

## 1. 前提・準備

### 必要なもの

- **Cursor**（または MCP 対応の AI コーディング IDE）
- **DuckDB/MotherDuck MCP サーバー**（ローカル DuckDB 推奨）
- **dbt**（DuckDB adapter）
- **uv**（Python 高速パッケージ管理・仮想環境ツール）
- **DuckDB 本体**（CLI や Python パッケージとして利用可能）
- **Parquet データ：**
  - `users.parquet`（異常値・型揺らぎ・NULL 混入あり）
  - `orders.parquet`（正常値のみ）

### DuckDB・uv のインストール例

#### macOS/Homebrew

```sh
brew install duckdb
brew install uv

# 仮想環境の作成とアクティベート
uv venv
source .venv/bin/activate
# 必要なパッケージのインストール（uvを使用）
uv pip install -r requirements.txt
```

### データの準備

Python で以下のように Parquet ファイルを作成（すでに生成済みの場合はスキップ）

```txt
python create_pq.py
```

---

## 2. dbt プロジェクトのセットアップ

```sh

# dbtプロジェクトの初期化
dbt init mcp_demo
rm -r mcp_demo/models/example

# ディレクトリ構造の作成
mkdir -p mcp_demo/models/staging
mkdir -p mcp_demo/models/mart
mkdir -p mcp_demo/data

# Parquetファイルをdata/ディレクトリに配置
mv ./users.parquet ./orders.parquet mcp_demo/data/
```

以下の記載は delete

```yml:dbt_project.yml
example:
      +materialized: view
```

---

## 3. MCP Server（DuckDB）設定

Cursor の「Settings > MCP > Add Global MCP Server」で以下を追加：

```json
{
  "mcpServers": {
    "mcp-server-duckdb": {
      "command": "uvx",
      "args": ["mcp-server-motherduck", "--db-path", ":memory:"]
    }
  }
}
```

---

## 4. Cursor での AI プロンプト例（MCP 活用）

Cursor の AI チャットに以下を入力：

```markdown
### Workflow

- DuckDB/MotherDuck MCP server（`mcp-server-duckdb`）を使い、Parquet データの構造やサンプルをプレビューしてください。
- プロジェクトのローカルパスは `/Users/yourname/projects` です。
- 目標は「異常値や型揺らぎを含むユーザーデータと、正常な注文データを JOIN し、ユーザーごとの購入集計 mart を dbt モデルで作成・検証」することです。
- 既存の dbt プロジェクトは `/Users/yourname/projects/mcp_demo` サブフォルダにあります。
- SQL や YAML の実装・修正時は、必ず `.cursor/rules/model_sql.mdc` ファイルのルールに従ってください。

---

### Tasks

1. **データ構造・内容の確認**

   - MCP サーバー（`mcp-server-duckdb`）を使い、`data/users.parquet`と`data/orders.parquet`について
     - `DESCRIBE SELECT * FROM read_parquet('<absolute_path>')`（必ず絶対パスで指定してください。例: `/Users/yourname/projects/mcp_demo/data/users.parquet`）
     - `SELECT * FROM read_parquet('<absolute_path>') LIMIT 1000`（必ず絶対パスで指定してください。例: `/Users/yourname/projects/mcp_demo/data/orders.parquet`）
       を実行してスキーマ・サンプルを取得し、出力を見せてください。

2. **staging モデルの提案・生成**

- stg_xxx.sql（staging モデル）の作成
  - 上記で定義した source を使って、staging モデル（stg_users.sql や stg_orders.sql）を書きます。
  - stg では、DuckDB の read_parquet 関数で絶対パス で指定した Parquet ファイルを参照します。
  - データの型揺らぎやクリーニングもこのタイミングで行います。
- mcp_demo/models/staging/schema.yml に models:を追加します。
  - stg モデルの SQL ができたら、その内容に合わせて schema.yml の models:セクションにカラム説明やテスト（not_null, unique など）を追加します。

3. **mart モデル（集計）の設計・生成**

   - `mcp_demo/models/mart/mart_user_sales.sql`として、staging users/orders を user_id で JOIN し、ユーザーごとの合計購入金額・注文回数を集計する SQL を作成してください。
   - mart ディレクトリ（mcp_demo/models/mart/）に schema.yml を作成
     - schema.yml の models: セクションで mart モデルの説明・カラム・テストを定義

4. **MCP 経由で SQL 検証**

   - 生成した staging/mart SQL を dbt run で実行し、モデルが正しく作成されるか・型エラーや JOIN 不整合がないか確認します。
   - エラーや NULL が多い場合は自動で SQL を修正し、再検証します。

5. **dbt テスト・ドキュメント生成**

   - `mcp_demo/tests/`配下に、ビジネスルール等の Singular テスト（SQL）を必要であれば追加します。
   - テスト追加・修正後は必ず `dbt test` を実行し、すべてのテストがパスすることを確認します。

6. **最終成果物の構造を一覧化**
   - 生成された staging/mart モデル、テスト、dbt プロジェクト構成のファイルパスと役割を一覧で説明してください。
```

---

## 5. 開発ワークフロー（AI ＋ MCP による自律的サイクル）

1. スキーマ・サンプル確認
   - AI が MCP 経由で`DESCRIBE SELECT * FROM read_parquet('mcp_demo/data/users.parquet')`等を実行
2. 異常値検出・型変換 SQL 自動生成
   - 例: `CASE WHEN TRY_CAST(age AS INTEGER) IS NOT NULL THEN CAST(age AS INTEGER) ELSE NULL END AS age`
3. staging モデル作成（mcp_demo/models/staging/stg_users.sql, mcp_demo/models/staging/stg_orders.sql）
4. mart モデル作成（models/mart_user_sales.sql）
5. MCP 経由で DuckDB にクエリを投げて検証
   - AI が「エラーが出たら自動修正」まで実施
6. dbt テストの自動生成（schema.yml）

---

## 7. dbt 実行・検証

```sh
dbt run
dbt test
```

---

## 8. 補足：MCP server 活用のポイント

- AI が「スキーマ確認 → 異常値検出 → 型変換 SQL 生成 → 検証 → 修正」まで自律的に回せる
- 人手で異常値を調査・修正指示せずとも AI がパイプラインを完成できる
- 現実の複雑なデータパイプライン開発において、MCP server 経由の AI 活用は圧倒的に効率的

---

## 9. 参考：プロンプト雛形

```markdown
1. MCP サーバーで各 Parquet のスキーマ・サンプルデータを確認
2. 異常値や型揺らぎを考慮した staging モデルを生成
3. JOIN・集計を行う mart モデルを作成
4. すべて MCP 経由で動作検証・自動修正
5. テスト（schema.yml）も自動生成
```

---

## 10. まとめ

MCP × DuckDB × Cursor × dbt の組み合わせにより、AI が現実のデータを"自分で見て・検証し・修正しながら"dbt データパイプラインを自律的に構築できる！現場の開発効率と品質が大幅に向上します。
