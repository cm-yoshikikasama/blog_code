# Claude Code コンテキスト管理ガイド

このドキュメントは、Claude Code のコンテキスト管理の仕組みと効率的な使い方をまとめたものです。

## /context コマンドの読み方

### 各項目の意味

```txt
Context Usage
⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛀ ⛀   claude-sonnet-4-5-20250929 · 64k/200k tokens (32%)
```

- System prompt (2.7k tokens): Claude Code の動作指示・ルール・振る舞いを定義
- System tools (14.5k tokens): 利用可能なツール（Read, Write, Edit, Bash など）の定義
- MCP tools (1.3k tokens): MCP サーバーから提供されるツールの定義
- Memory files (42 tokens): CLAUDE.md などのプロジェクト設定ファイル
- Messages (8 tokens): 現在の会話履歴（ツール実行結果を含む）
- Free space (136k): まだ使える空き容量
- Auto-compact buffer (45.0k tokens): 会話が長くなった際に古いメッセージを自動圧縮するための予約領域

## コンテキスト容量と情報の保持

### 削除される情報と削除されない情報

200k トークンの制限に達した場合の動作：

削除されない（常に保持）：

- System prompt
- System tools 定義
- MCP tools 定義
- Memory files (CLAUDE.md など)

削除・圧縮される：

- Messages（会話履歴）の古い部分
- ファイル読み込み結果などのツール実行結果

つまり、コンテキスト容量がいっぱいになっても、Claude の基本的な指示やルールは守られ続けます。

### コンテキスト使用量と遵守度の関係

理論上は、30k トークン使用時も 199k トークン使用時も、CLAUDE.md の遵守度は同じです。ただし、実際には以下の現象が起こる可能性があります：

Recency Bias（直近重視）：

- 会話の直近のやりとりに強く影響される
- 長い会話の後半で「ルールを忘れる」ように見えることがある

Needle in a Haystack 問題：

- コンテキストが長いほど、特定の指示を見つけにくくなる可能性
- ただし System Prompt や Memory Files は特別な位置に配置されるため影響は少ない

実用的には、基本的に遵守されますが、長い会話では定期的にルールを再確認するのが安全です。

## Memory Files (CLAUDE.md) の扱い

### 「優先度が高い」の意味

技術的には明示的な優先度設定はありません。ただし：

コンテキストの構造：

```txt
┌─────────────────────────┐
│ System Prompt           │ ← 先頭付近
├─────────────────────────┤
│ Tool Definitions        │
├─────────────────────────┤
│ Memory Files (CLAUDE.md)│ ← 先頭付近
├─────────────────────────┤
│ Messages (会話履歴)      │ ← 後方
└─────────────────────────┘
```

AI モデルは先頭と末尾の情報を重視する傾向があります（実験的に知られている）。

構造化タグによる識別：

- `<system-reminder>`や`<memory>`などの特殊タグで囲まれている
- これにより「重要な情報」として認識しやすくなる

削除されない保証：

- 会話が長くなっても Memory Files は自動削除されない
- 古い Messages は圧縮・削除されるが、CLAUDE.md は残る

正確には「優先度高」ではなく、「常に参照可能で、構造的に重要な位置に配置されている」が正しい表現です。

## ツールによるコンテキスト消費の違い

### MCP Tools vs Claude Skills/Task Agent

MCP Tools の場合：

```txt
1. ツール定義: 1.3k tokens（/context で見える）
2. ツール実行結果もすべてコンテキストに残る

例：
mcp__aws_docs__search("Lambda")
↓
結果: 50,000 文字のドキュメント全文
→ 約 12k tokens 消費
→ 会話履歴（Messages）に永続的に残る
```

Claude Skills/Task Agent の場合：

```txt
1. スキル定義: 含まれる
2. スキル内部の処理は別コンテキストで実行
3. 最終結果のみ返される

例：
Task(subagent_type="Explore", prompt="...")
↓
エージェント内部で：
- 10 個のファイル読み込み
- 複数回の Grep 実行
- 分析処理
（これらは親コンテキストに含まれない）
↓
最終レポート: 500 文字のサマリー
→ 約 125 tokens のみ消費
```

なぜこの違いが生まれるか：

- MCP: すべての入出力が会話履歴に記録される
- Skills/Agents: サブプロセスとして実行、内部処理は独立したコンテキスト

### /context での見え方

```txt
MCP tools: 1.3k tokens  ← これは定義のみ
Messages: 50k tokens    ← MCP 実行結果はここに含まれる
```

MCP ツールの実行結果は「Messages」としてカウントされます。

## ファイル・ドキュメント参照時のコンテキスト消費

### Read ツール

```txt
Read(/path/to/large_file.py)  # 5000 行のファイル
↓
結果: ファイル全内容がコンテキストに追加
→ 約 10-15k tokens 消費
→ 会話履歴（Messages）に残る
```

実際のコンテキスト内容：

```txt
<function_calls>
  <invoke name="Read">
    <parameter name="file_path">/path/to/file.py</parameter>
  </invoke>
</function_calls>

<function_results>
     1  # ファイル内容の 1 行目
     2  # ファイル内容の 2 行目
     ...
  5000  # ファイル内容の 5000 行目
</function_results>
```

これが全部 Messages にカウントされます。

### Grep ツール

ファイルパスのみ取得（効率的）：

```txt
Grep("keyword", output_mode="files_with_matches")
↓
結果: ファイルパスのリストのみ
→ 約 100 tokens 程度
```

内容も取得（コンテキスト消費大）：

```txt
Grep("keyword", output_mode="content", -C=10)
↓
結果: マッチした行 + 前後 10 行 × マッチ数
→ 数千 tokens 消費の可能性
```

### WebFetch ツール（効率的）

```txt
WebFetch("https://docs.aws.amazon.com/lambda/...",
         prompt="Lambda 関数の書き方を教えて")
↓
1. ページ全体を取得（内部処理）
2. AI モデルでサマリー生成
3. サマリーのみ返される
→ 約 500-1000 tokens（効率的）
```

### MCP ドキュメントツール（消費大）

```txt
mcp__aws_docs__search_documentation("Lambda")
↓
結果: 検索結果全文
→ 約 5-10k tokens 消費

mcp__aws_docs__read_documentation("lambda/getting-started")
↓
結果: ドキュメント全文
→ 約 10-20k tokens 消費
```

### コンテキスト使用量の変化例

```txt
最初の状態:
Messages: 8 tokens

Read(big_file.py) 実行後:
Messages: 15k tokens  ← ファイル内容が追加

WebFetch(aws_docs) 実行後:
Messages: 16k tokens  ← サマリーのみ追加（+1k）

Task(Explore) 実行後:
Messages: 16.5k tokens  ← 結果レポートのみ（+0.5k）
```

## コンテキスト節約のベストプラクティス

### Task Agent を活用する

非効率な方法：

```typescript
// 合計 30k tokens 消費
Read(file1.py); // +10k
Read(file2.py); // +10k
Read(file3.py); // +10k
```

効率的な方法：

```typescript
// 結果レポートのみ: 約 1k tokens
Task((subagent_type = "Explore"), (prompt = "file1-3.py を読んで問題点を報告"));
```

### Grep の工夫

非効率な方法：

```typescript
// 大量出力
Grep("function", output_mode="content", -C=50)
```

効率的な方法：

```typescript
// まずファイル特定
Grep("function", (output_mode = "files_with_matches"));
// → 該当ファイルが判明してから必要な部分だけ Read
```

### WebFetch は効率的

WebFetch は自動的にサマリー化されるため効率的です：

```typescript
WebFetch("https://long-documentation.com", (prompt = "必要な情報だけ抽出して"));
```

## コンテキスト消費量の比較表

| ツール         | コンテキスト消費 | 理由                     |
| -------------- | ---------------- | ------------------------ |
| Read           | 大（全内容）     | ファイル全体が履歴に残る |
| Grep (files)   | 小               | パスのみ                 |
| Grep (content) | 中〜大           | マッチ内容による         |
| WebFetch       | 小〜中           | 自動サマリー化           |
| MCP docs       | 大               | 全文が履歴に残る         |
| Task Agent     | 小               | 最終レポートのみ         |

## Subagent によるコンテキスト管理

### Subagent とは

Subagent は Task ツールを使用して起動される専門的な AI アシスタントです。各 Subagent は独立したコンテキストウィンドウと実行ループを持ち、親会話とは完全に分離された環境で動作します。

Task ツールと Subagent の関係：

- Subagent は Task tool の上に構築された管理層
- 両者は同じ並列処理エンジンを共有
- 各タスクは独立したコンテキストウィンドウを取得

### コンテキスト消費の仕組み

親コンテキストで消費されるもの：

1. Task ツールの呼び出し（約 100-200 tokens）
2. Subagent からの最終サマリーレポート（約 500-2000 tokens）

親コンテキストで消費されないもの：

- Subagent 内部での Read/Grep/Glob などのツール実行結果
- Subagent 内部での会話や思考プロセス
- Subagent が読み込んだファイルの全内容
- 詳細な実装作業の記録

### Context Pollution（コンテキスト汚染）の防止

Subagent の主要な目的は、詳細な実装作業が親会話を「汚染」することを防ぐことです：

問題：直接ツールを使用した場合

```txt
親コンテキストの状態：
1. Read(file1.py) → 全内容 10k tokens
2. Read(file2.py) → 全内容 10k tokens
3. Grep("error", output_mode="content") → マッチ結果 5k tokens
4. Read(file3.py) → 全内容 10k tokens
5. 詳細な分析と修正作業 → 10k tokens
----------------------------------------------
合計: 約 45k tokens が親コンテキストに蓄積
→ メイン会話が詳細で埋もれる
```

解決：Subagent を使用した場合

```txt
親コンテキストの状態：
1. Task 呼び出し → 150 tokens
2. 最終レポート → 1.5k tokens
----------------------------------------------
合計: 約 1.7k tokens のみ

Subagent の独立コンテキスト（親に影響しない）：
- Read(file1.py) → 10k tokens
- Read(file2.py) → 10k tokens
- Grep("error") → 5k tokens
- Read(file3.py) → 10k tokens
- 詳細な分析 → 10k tokens
→ この 45k tokens は親コンテキストと完全に分離
→ 詳細は Ctrl+O で確認可能
```

### 利用可能な Subagent タイプ

組み込み Subagent：

general-purpose

- 汎用的な複雑タスク処理
- すべてのツールにアクセス可能
- 複数ステップが必要な調査・分析

Explore

- コードベース探索専用（高速）
- すべてのツールにアクセス可能
- thoroughness レベル指定可能（quick/medium/very thorough）

Plan

- 実装計画の立案専用（高速）
- Read、Glob、Grep、Bash ツールにアクセス
- ファイル検索、コード構造分析、コンテキスト収集
- thoroughness レベル指定可能（quick/medium/very thorough）

statusline-setup

- ステータスライン設定専用
- Read、Edit ツールのみアクセス可能

カスタム Subagent：

- `.claude/agents/` ディレクトリに Markdown ファイルで定義
- カスタムシステムプロンプト、ツール権限、モデル選択が可能
- 例：code-reviewer、debugger、data-scientist など

### Subagent の並列実行

Subagent は並列実行可能で、複数のタスクを同時処理できます：

- 並列実行上限：10 個
- 使用例：複数ファイルの同時分析、並列テスト実行など

### いつ Subagent を使うべきか

Subagent を使うべき場合：

コンテキスト汚染を防ぎたい場合：

- 大量のファイルを読み込む必要がある
- 詳細な実装作業が必要
- セキュリティ監査、テスト生成、リファクタリングなどの深掘り作業

オープンエンドな調査：

- 「エラーハンドリングはどこで行われている？」
- 「コードベースの構造は？」
- 「認証の仕組みは？」

並列処理が必要な場合：

- 複数のファイルやモジュールを同時分析
- 独立したタスクを並行実行

直接ツールを使うべき場合：

特定のファイル/クラス/関数を探す場合：

- `class UserAuth` を探す → Glob 使用
- 特定のファイルパスを読む → Read 使用
- 特定の 2-3 ファイル内を検索 → Read 使用
- 小規模で簡単なタスク

## 重要な注意点

一度 Read したファイルや MCP ツールで取得したデータは、会話が続く限りコンテキストに残り続けます。大量のファイルを読み込む場合は、Subagent（Task ツール）の活用を検討してください。

## Subagent を使った開発ワークフロー

設計、開発、テスト、レビューまでの一連の流れを Subagent でどう管理するかのベストプラクティス（2025年版）。

### 基本方針

親コンテキスト = オーケストレーター（指揮者）Subagent = 専門家チーム

Subagent 間は直接通信できないため、親が情報のハブとなる。

### 推奨ワークフローパターン

Anthropic 公式推奨のパイプラインパターン：

```txt
1. Analyst (要件分析) → Explore subagent で調査
   ↓
2. Architect (設計) → Plan subagent または親で実施
   ↓
3. Implementer (実装) → 親 or general-purpose subagent
   ↓
4. Tester (テスト) → テスト実行
   ↓
5. Reviewer (レビュー) → code-reviewer subagent
   ↓
6. Security (監査) → security-auditor subagent
```

### タスク規模別の推奨アプローチ

小規模タスク（1-2ファイル）：

```txt
1. 親が実装
2. code-reviewer subagent でレビュー
3. 親が修正
```

コンテキスト汚染の心配がないため、シンプルに親で処理。

中規模タスク（3-10ファイル）：

```txt
1. Explore subagent で調査
   → ファイルパスと構造をレポート
2. 親が重要ファイルのみ Read（2-3個）
3. 親が実装
4. code-reviewer subagent でレビュー
5. 親が修正
```

詳細な情報は親に保持し、Subagent で専門作業を実施。

大規模タスク（10+ファイル、複数機能）：

```txt
1. Plan subagent (thoroughness: very thorough)
   → 全体設計とファイル構成をレポート
2. 親がレポートをもとに実装計画を立てる
3. 並列実行（最大10個）：
   - Task A: 機能Aの実装（general-purpose）
   - Task B: 機能Bの実装（general-purpose）
   - Task C: 共通ライブラリ（general-purpose）
4. 親が統合作業
5. 並列レビュー：
   - code-reviewer: 品質チェック
   - security-auditor: セキュリティチェック
6. 親が問題を修正
7. テスト実行
```

### 情報の引き継ぎパターン

Subagent A の結果を Subagent B に引き継ぐ方法：

引き継げる情報：

- Subagent A の最終レポート（サマリー）
- 結論、ファイルパス、問題点のリストなど

引き継げない情報：

- Subagent A の内部コンテキスト
- 読み込んだファイルの全内容
- 詳細な分析プロセス

実装パターン：

```txt
方法1: 親で情報を統合

1. Explore subagent で調査
   → レポート「auth.ts の50行目に問題」
2. 親が auth.ts を Read（詳細を確認）
3. 親が実装（またはgeneral-purpose subagentに指示）
```

```txt
方法2: 1つの Subagent で完結

Task(
  subagent_type="general-purpose",
  prompt="認証処理を調査して、バグを修正してください"
)
```

general-purpose は全ツールにアクセスでき、調査→実装を1つの内部コンテキストで処理。

### 重要なベストプラクティス

Single Responsibility（単一責任）：

- 各 Subagent は1つの役割のみ
- 悪い例：「調査して実装してテストして」を1つの Subagent に詰め込む
- 良い例：調査専用、実装専用、テスト専用に分割

Context Isolation（コンテキスト分離）：

- 詳細な作業は Subagent 内で完結
- 親には次のアクションに必要な情報のみ返す
- 実例：31個の問題を発見したレビューでも、親には簡潔なリスト

Tool Restrictions（最小権限）：

- 各 Subagent に必要最小限のツール権限のみ付与
- 例：tester には Read, Bash のみ（Write/Edit は不要）
- セキュリティとミス防止のため

親での情報統合：

- Subagent 間は直接通信できない
- 親が情報のハブとなり、必要な情報を次の Subagent に伝える
- レポートの要約を次の指示に含める

### 並列実行パターン

7-Parallel-Task Method（独立性が高い場合）：

1つの機能追加で7つのタスクを並列実行：

1. メインコンポーネントファイル作成
2. CSS/スタイル作成
3. テストファイル作成
4. 型定義作成
5. カスタムフック/ユーティリティ作成
6. ルーティング/import 更新
7. package.json/ドキュメント更新

全て完了後に統合。

注意点：

- 並列上限は10個
- 独立したタスクのみ並列化
- 依存関係がある場合は逐次実行

### コンテキスト節約の効果

実測値（131行のファイルを処理）：

- Subagent 使用：約 314 tokens（サマリーのみ）
- 直接 Read：約 2,180 tokens（ファイル全内容）
- 節約効果：約 85% 削減

大規模なコードベース探索では、Subagent によるコンテキスト節約が特に有効。

### Task Tool vs Subagent の使い分け

Subagent を選ぶべき場面：

- 繰り返し実行するワークフロー
- チーム協働が必要な場合
- 専門知識を永続的に保持したい（`.claude/agents/` に定義）

Task Tool を選ぶべき場面：

- 単発の調査タスク
- アドホックな柔軟性が必要
- 大規模コードベース探索の並列処理

新規開発では「Subagent から始める」のが推奨。保守性に優れているため。

## 参考リンク

- Claude Code 公式ドキュメント（Subagents）: https://code.claude.com/docs/en/sub-agents
- Context Management with Subagents: https://www.richsnapp.com/article/2025/10-05-context-management-with-subagents-in-claude-code
- Task Tool vs Subagents: https://www.icodewith.ai/blog/task-tool-vs-subagents-how-agents-work-in-claude-code/
- Claude Code Best Practices (Anthropic公式): https://www.anthropic.com/engineering/claude-code-best-practices
