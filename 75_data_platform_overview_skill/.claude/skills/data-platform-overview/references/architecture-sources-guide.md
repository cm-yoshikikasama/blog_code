# 構成の根拠を確かめる手段

構成の根拠には、各社が公開している設計の指針・製品の公式ドキュメント・DevelopersIO の検証記事を使う。モデルが学習した時点の情報は古いことがあるため、毎回読んで確かめる。出典には URL と確認日を添える。

## 今日の日付から新しい情報を探す

実行を始めたときに、Claude Code の環境に表示されている今日の日付を確かめる。表示されていなければ `date` で確かめる。この日付を次のように使う。

- 推奨案で使う製品ごとに、リリースノートのうち今日から 3 か月前までの分を読み、製品名の変更・提供状況の変化（プレビューから一般提供、提供の終了）・東京リージョンへの追加がないかを確かめる
- WebSearch で探すときは、検索語に今日の年を入れる（例: `Snowflake Cortex Analyst {今日の年}`。`{今日の年}` は実行した日の年に置き換える）。検索結果は公開日か更新日が新しいものを先に読む
- 読んだページに更新日があれば、今日の日付と比べる。1 年以上前のページで提供状況を判断するときは、リリースノートで変わっていないかを確かめる
- 出典の確認日には、この日付を書く

## 読む範囲

読む範囲は次のとおりにする。独立した確認は 1 回の応答でまとめて並列に呼ぶ。

- 確かめるのは、推奨案の構成要素について「この構成を選んだ理由」に書く制約だけにする。代替案は確かめず、その案が向く条件を書くだけにする
- 実装の細部（スケジュールのタイムゾーン、通知先の種類、ジョブの種類ごとの制限など）は、判断を変えないかぎり調べない
- 1 つの項目で答えが見つからなければ、2 回目の検索で打ち切る。リリースノートを読んだ回は 1 回目に数える。打ち切った項目は理由の表に書かず、データ基盤の担当が確かめることとして次にやることに入れる。表現を変えて探し続けない
- 同じ事実を確かめるために複数のページを読まない。MCP サーバーの検索結果で足りるときは、ページ全体を WebFetch で読まない

## 設計の指針

推奨案と代替案で判断が分かれる構成要素（取り込み方式・変換の実行場所・接続方式など）で、判断の根拠になる記述を探すときに読む。柱の名前（セキュリティ・信頼性・パフォーマンス・コスト・運用）を書くためだけには読まない。

| 対象 | 指針 | 手段 |
|------|------|------|
| AWS 全体 | AWS Well-Architected Framework（https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html） | AWS Knowledge MCP サーバーの `search_documentation` |
| AWS のデータ分析 | Data Analytics Lens（https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/analytics-lens.html） | AWS Knowledge MCP サーバーの `search_documentation` |
| Snowflake | Snowflake Well-Architected Framework（https://www.snowflake.com/en/product/use-cases/well-architected-framework/） | WebFetch |
| Databricks | Databricks well-architected framework（https://docs.databricks.com/aws/en/lakehouse-architecture/well-architected） | WebFetch |
| dbt | dbt のベストプラクティス（https://docs.getdbt.com/best-practices） | dbt MCP サーバーの `search_product_docs` |

## 製品の仕様

「この構成を選んだ理由」に書く制約を確かめる。確認するのは、提供状況（GA かプレビューか）・東京リージョンで使えるか・エディションの要件・Q2 のソースに対応するコネクタの有無のうち、その構成要素の判断に使うものだけにする。

| 製品 | 手段 |
|------|------|
| AWS | AWS Knowledge MCP サーバーの `search_documentation` と `get_regional_availability` |
| dbt | dbt MCP サーバーの `search_product_docs` |
| Snowflake・Databricks | 公式ドキュメントを WebFetch で読む |

MCP サーバーが使えない環境では、公式ドキュメントを WebFetch で読む。

## 検証記事

推奨案と代替案で判断が分かれる構成要素について、実際に動かしたときの手順・挙動・制約を確かめるときは、DevelopersIO（https://dev.classmethod.jp/ ）の記事を読む。WebSearch の `allowed_domains` に `dev.classmethod.jp` を指定し、製品名と機能名で検索する。

記事は公開した日の時点の情報のため、記事で知った制約と提供状況は「製品の仕様」の手段で公式ドキュメントと照らす。出典には記事の URL と公開日を添える。
