# claude-usage-digest 詳細手順

`SKILL_DIR` はこの SKILL.md の絶対パスのディレクトリ。

## Step 0: 設定の読み込みと AWS プロファイル確定（必須）

まず `${SKILL_DIR}/custom/config.env` を Read ツールで読み込む（Bash の `source` は不可）。内容を `KEY=VALUE` としてパースし、`AWS_PROFILE` / `SLACK_CHANNEL` / `LOG_GROUP` を作業変数として保持する。フォーマットは `references/config.env.example` を参照。

`AWS_PROFILE` が config.env で設定されていればそれを使う。未設定（または config.env 不在 / Read 失敗）のときだけ AskUserQuestion で訊く。

| 変数         | 値                                                            |
| ------------ | ------------------------------------------------------------- |
| LOG_GROUP    | `config.env` の `LOG_GROUP`（`/{ProjectName}/claude-otel-sanitized`） |
| REGION       | `us-east-1`（固定）                                           |
| AWS_PROFILE  | `config.env` の `AWS_PROFILE`、未設定なら AskUserQuestion     |
| SLACK_CHANNEL| `config.env` の `SLACK_CHANNEL`、未設定なら投稿時に確認       |
| DAYS         | ダイジェストモード=7（既定） / 分析モード=問い次第（既定 31）                 |

実行前に必ず以下を済ませる。`queries.txt` の全セクションをこのタイミングで個別ファイルに展開しておけば、以降の Bash 呼び出しから awk を排除できる。

```bash
mkdir -p /tmp/claude/usage-digest
S=$(($(date +%s) - ${DAYS:-7} * 86400)); E=$(date +%s)
awk '/^### /{section=$2; out="/tmp/claude/usage-digest/q_" section ".txt"; next}
     section && NF { print > out }' ${SKILL_DIR}/scripts/queries.txt
```

## ダイジェストモード（引数なし）

出力は Slack メッセージ（表は `コードブロック` で等幅）。`${SKILL_DIR}/templates/digest-template.txt` を読み込み、データ穴埋め + 公式知見ベースの考察生成で組み立てる。

### 1. 4 本のクエリを直列実行（DAYS=7）

順序

1. `digest_totals`
2. `heavy_users`
3. `top_skills`（skill × user。「誰が何を」の表に使う）
4. `top_mcps`

各セクションを 1 Bash 呼び出しで実行する。`file://` 参照・段階 sleep ポーリング。並列起動は禁止。

```bash
N=digest_totals
QID=$(AWS_PROFILE=$AWS_PROFILE aws logs start-query \
  --region ${REGION:-us-east-1} \
  --log-group-name $LOG_GROUP \
  --start-time $S --end-time $E \
  --query-string file:///tmp/claude/usage-digest/q_$N.txt \
  --query queryId --output text)
for delay in 3 5 8 13 21 30; do
  sleep $delay
  STATUS=$(AWS_PROFILE=$AWS_PROFILE aws logs get-query-results \
    --region ${REGION:-us-east-1} --query-id $QID --output json \
    > /tmp/claude/usage-digest/raw_$N.json && jq -r '.status' /tmp/claude/usage-digest/raw_$N.json)
  [ "$STATUS" = "Complete" ] && break
done
jq -r '.results // [] | .[] | [ .[].value ] | @tsv' /tmp/claude/usage-digest/raw_$N.json \
  > /tmp/claude/usage-digest/tsv_$N
```

### 2. テンプレの穴埋め（データ部分）

`${SKILL_DIR}/templates/digest-template.txt` を読み、プレースホルダを埋める。出力は Slack にそのまま貼れるメッセージ（表は `コードブロック` 内、見出しは `▼`、箇条書きは `-`）。user は全て local-part のみ。

- `{{DAYS}}` `{{active_users}}` `{{sessions}}` `{{messages}}` `{{skills}}` `{{subagents}}` `{{mcps}}` ← `digest_totals`
- `{{skill_user_table}}` ← `top_skills`（skill × user × 回数）を等幅で桁揃えした表に。ヘッダ `スキル / 回数 / 使い手 / 説明`。上位8件前後。同一スキルで複数ユーザーは回数上位を代表に。`説明` は「何をするスキルか」を簡潔に
- `{{heavy_user_lines}}` ← `heavy_users` を `- {user}（{sessions}セッション、一言）` の箇条書きに。一言はそのユーザーが使った代表スキルから推測（無理に書かない）
- `{{mcp_user_table}}` ← `top_mcps`（mcp × user × 回数）を等幅で桁揃えした表に。ヘッダ `MCP / 回数 / 使い手 / 用途`。ノイズ（ランダム ID 等）は除外し上位5件前後。`用途` は MCP 名から簡潔に

桁揃えのコツ: 数値・使い手まで（ASCII）をスペースで揃え、可変幅の日本語（`説明`/`用途`）は最後の列に置く。これで前の列の桁が崩れない。

### 3. AI考察を生成（このスキルの肝・公式知見に接続する）

#### 3.0 先に公式知見をライブ取得する（必須・WebFetch、毎回最新）

考察を書く前に、公式 Claude Code ドキュメントを WebFetch で直接読み、毎回最新を取得する。取得先は `code.claude.com` / `docs.claude.com`。

主に読むページ

- `https://code.claude.com/docs/en/changelog.md` — 最新リリースノート。最新機能の一次情報で `{{suggestions}}` の主軸
- 今週観測したスキル/MCP/subagent に関連するページを必要に応じて

取得した最新内容を下の3枠、特に `{{suggestions}}` の根拠にする。WebFetch に失敗したときは自分の知識でフォールバックし「最新は要確認」と添える。

#### 3.1 3枠を埋める

データの言い換えで終わらせない。「観測 → 公式ドキュメントのベストプラクティス/機能 → 具体的な次の一手」に接続して深い考察を書く。

- `{{praise}}`（すごい活用）: 上位スキルの使い手を、公式の文脈に乗せて称える。必ず 5 個
- `{{trend}}`（トレンド）: `subagent` / `MCP` の回数・偏りを公式のパターンに接続。1-2 文
- `{{suggestions}}`（もっと活用するなら）: WebFetch した公式ドキュメントの最新機能を中心に、このチームの使い方に刺さるものを 2-4 個、具体的に（「何ができる → なぜこのチームに効く」）。各項目に出典 URL

### 4. 出力と配信

- 組み上げた Slack メッセージを `text` コードブロックで提示（コピペでそのまま Slack に貼れる形）
- ブロックの後に「対象期間（直近7日 / 取得日）」を 1 行添える
- 既定はドラフト出力。ユーザーが「投稿して」と明示した場合のみ Slack MCP 等で投稿する

## 分析モード（引数あり・自然言語の利用分析）

### 1. 意図の分解

ユーザーの問いから対象期間・対象ユーザー・集計対象・並び順を抽出する。曖昧な場合は仮定を 1 行で宣言してから進む。

| 項目         | 例                                                              |
| ------------ | --------------------------------------------------------------- |
| 対象期間     | 「先週」→ 7 日、「今月」→ 30 日、明示なし → 31 日               |
| 対象ユーザー | 「特定ユーザーの」→ `attributes.user.email like /<local-part>/` |
| 集計対象     | スキル発火 / コスト / セッション / MCP / subagent / モデル      |
| 並び順       | コスト降順 / 回数降順 / 時系列 / 異常値                         |

### 2. クエリ作成

`scripts/queries.txt` の既存セクション（`### per_user` / `### top_skills` 等）をスキーマ参照のテンプレートに、必要なフィールド・フィルタ・stats を組み立てる。1 クエリ 1 目的。必ず一度ファイルに保存してから実行する。

原因分析（コスト/トークン急増の要因特定）には `### cost_drivers_template` / `### token_drivers_template`（`relevantfields`）を使う。field list を絞り、時間範囲は 7d 以下にする（フィールド評価が重い）。

### 3. 実行と取得

ダイジェストモード と同じ start-query + `file://` + 段階 sleep ポーリング。1 Bash 呼び出しは start-query 1 本 + get-query-results 数本まで。並列禁止。

### 4. 要約

- 期間・LogGroup・クエリ意図を冒頭 1 行で明示し、テーブル + 観察文 で返す
- 集計単位（`per user × skill` など）を明記する
- メールは local-part のみで表示する
- 出ない理由が想定される場合は補足する（例: 「`<repo>/.claude/skills/{name}/` のスキルは `skill_activated` を発火しないため Top skills には現れない」）

## 共通の注意

- `aws logs start-query --query-string` にはファイル参照（`file://...`）を使う。インライン文字列は botocore 失敗の原因になる
- クエリの `sort` で `desc` 指定を忘れない
- 結果が 0 件のときは TSV が空。`(no data)` と表示して次へ進む
- raw 側を見たいリクエスト（「Bash で何を実行したか調べて」等）は sanitized では取得不可能であることを伝え、必要なら raw LogGroup を一時的に直接クエリする許可をユーザーに確認する
