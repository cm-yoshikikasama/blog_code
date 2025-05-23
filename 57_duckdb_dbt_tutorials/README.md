# dbt + duckdb 開発用 devcontainer 利用手順

このディレクトリには、`dbt` と `duckdb` をすぐに使い始められる devcontainer（`.devcontainer/dbt-duckdb-dev/`）が含まれています。

---

## 使い方

1. **VSCode でこのリポジトリを開く**
2. コマンドパレットから「Reopen in Container」を実行
3. ターミナルで `dbt` コマンドが使えることを確認

   ```sh
   dbt --version
   ```

4. **dbt 公式チュートリアルに従ってプロジェクトを作成**

   例（`jaffle_shop` プロジェクトを作成）:

   ```sh
   dbt init jaffle_shop
   cd jaffle_shop
   ```

5. あとは[公式チュートリアル](https://docs.getdbt.com/guides/quickstarts/manual-install)の手順通りに進めてください。

---

## duckdb 用プロファイル例

`profiles.yml` の例（`~/.dbt/profiles.yml` またはプロジェクト直下に配置）:

```sql
cd /workspaces/blog_code/57_duckdb_dbt_tutorials/jaffle_shop
vim profiles.yml
```

```yaml
jaffle_shop:
  outputs:
    dev:
      type: duckdb
      path: /workspace/jaffle_shop/jaffle_shop.db
  target: dev
```

```sql
export DBT_PROFILES_DIR=/workspaces/blog_code/57_duckdb_dbt_tutorials/jaffle_shop
dbt run
duckdb /workspaces/blog_code/57_duckdb_dbt_tutorials/jaffle_shop/jaffle_shop.db
```

---

## 補足

- 必要に応じて CSV ファイル等を `/workspace/jaffle_shop/` 配下に配置し、duckdb でテーブル作成も可能です。
- dbt のバージョンや duckdb-cli も devcontainer 内で利用できます。

---

## 参考

- [dbt 公式クイックスタート（英語）](https://docs.getdbt.com/guides/quickstarts/manual-install)
- https://qiita.com/sigeta/items/d9c673c1f9dde80e1291
- https://qiita.com/idenrai/items/01593c38ea76fe463b1a
