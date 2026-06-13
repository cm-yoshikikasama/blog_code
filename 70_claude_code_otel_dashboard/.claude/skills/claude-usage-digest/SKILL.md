---
name: claude-usage-digest
description: >
  sanitized OTel CloudWatch Logs から Claude Code の利用状況を集計する Skill。引数なし→週次 Slack ダイジェスト、引数あり→自然言語で利用分析。
  TRIGGER: 週次ダイジェスト / 今週の利用まとめ / Claude のコスト分析。DO NOT TRIGGER: OTel インフラ変更・raw ログ調査。
allowed-tools: Bash(aws logs *), Bash(awk *), Bash(jq *), Bash(date *), Bash(sleep *), Bash(mkdir *), Read, AskUserQuestion, WebFetch(domain:code.claude.com), WebFetch(domain:docs.claude.com)
argument-hint: "[省略時=週次 Slack ダイジェスト / 引数=自然言語の利用分析]"
disable-model-invocation: true
---

## ワークフロー概要

1. `custom/config.env` を Read ツールで読み込み `AWS_PROFILE` / `SLACK_CHANNEL` / `LOG_GROUP` を取得する。`AWS_PROFILE` 未設定のときだけ AskUserQuestion で訊く
2. 引数を確認する
   - 引数なし → ダイジェストモード（週次 Slack ダイジェスト）。既定 `DAYS=7`
   - 引数あり → 分析モード（自然言語の利用分析）。期間は問いから判断（既定 31）
3. ダイジェストモード: `scripts/queries.txt` の `### digest_totals` / `### heavy_users` / `### top_skills` / `### top_mcps` を 7 日窓で直列実行し、公式ドキュメント（`code.claude.com`、特に changelog）を WebFetch でライブ取得してから、`templates/digest-template.txt`（Slack メッセージ形式）にデータと公式知見ベースの AI考察を埋めて生成する
4. 分析モード: 引数を意図に分解し、`scripts/queries.txt` のスキーマを参考に Insights クエリを 1 本作って実行、結果を自然言語で要約する
5. ダイジェストは「活用してる人・スキルを称える」ポジティブ枠のみ。非活用者を名指しで晒さない

詳細手順は [INSTRUCTIONS.md](references/INSTRUCTIONS.md) を参照。

## 注意事項

このスキルは sanitized LogGroup のみを対象とする。raw LogGroup (`/{ProjectName}/claude-otel`) には `bash_command` / `tool_input` / `prompt` 等の機密情報が混入しているため対象外。

- 環境固有の設定は `custom/config.env` に置き、Step 0 で Read ツールで読み込む（フォーマットは `references/config.env.example` を参照）
- REGION は固定値 `us-east-1`
- DAYS 既定値は ダイジェストモード で 7、分析モード は問い次第（明示なし → 31）
- ロググループが空・期間内データ無しは `(no data)` 表示でエラー扱いしない

sanitized 側で使えない属性をクエリに含めると常時 0 件になる。allowlist に含まれない属性は参照しない。

| 種別 | 使える属性 |
|---|---|
| `attributes` | `cost_usd`, `user.email`, `session.id`, `tool_name`, `input_tokens`, `cache_read_tokens`, `model`, `skill.name`, `tool_parameters`（中身は `subagent_type` と `mcp_server_name` のみ抽出済み） |
| `resource.attributes` | `user.plan`, `service.name`, `service.version` |
| トップレベル | `body`, `@timestamp` |

`body` 値の一覧

- `claude_code.user_prompt` — メッセージ数（プロンプト本文は `<REDACTED>`）
- `claude_code.skill_activated` — スキル発火（`attributes.skill.name` あり）
- `claude_code.tool_result` — ツール実行結果（`attributes.tool_name` で `Agent` / `mcp_tool` / その他を判別）
- `claude_code.api_request` — モデル呼び出し（`attributes.model` あり）

awscli 安定運用のための制約

- クエリは事前にファイルへ書き出して `--query-string file://...` で参照する
- 1 回の Bash tool 呼び出しは start-query 1 本 + get-query-results 数本までに抑える
- ダイジェストモード の各クエリは直列で発行する（並列禁止）

privacy / 体裁

- 中間ファイルは `/tmp/claude/usage-digest/` に保存する
- `attributes.user.email` はダイジェスト・要約では local-part のみに省略する
- ダイジェストに非活用者（利用が少ない人）の名指しを入れない。ポジティブ枠（ヘビーユーザー・スキルの使い手）だけ
- 出力は Slack メッセージ（表は ``` コードブロック ``` で等幅、見出し `▼`、箇条書き `-`）

## 品質ゲート

以下を全て確認するまで完了としない

- 実行したクエリの `query-string` ファイルが `/tmp/claude/usage-digest/` に残っている
- ダイジェストモード: 出力が Slack メッセージで、`▼` 見出し・コードブロック内の等幅スキル表・ヘビーユーザー・AI考察・末尾のダッシュボード/OTel案内を含む
- ダイジェストモード: 考察を書く前に `code.claude.com` の公式ドキュメント（changelog 等）を WebFetch でライブ取得し、「観測 → 公式ベストプラクティス/機能 → 次の一手」になっている（データの言い換えで終わっていない）
- ダイジェストモード: 個人名は local-part のみ。非活用者の名指しが無い。数値・スキル名が取得した実データと一致している
- ダイジェストモード: テンプレのプレースホルダ（`{{...}}`）が出力に残っていない
- 分析モード: 回答が「結果データ」「集計単位の説明」「観察された傾向」の 3 要素を含む
- 機密情報（生の bash コマンド、ファイル本体、プロジェクト固有名）が出力に混入していない
