# Blog_Code

ブログで紹介したソースコードを掲載するリポジトリです。

## 特徴

- AWS CDK: TypeScript によるインフラストラクチャコード
- サーバーレス: Lambda, Glue, Step Functions などの実装例
- 自動フォーマット & Lint: Claude Code hooks により編集時に自動実行

## 開発環境

### 自動フォーマット & Lint（Claude Code）

このリポジトリは Claude Code の hooks 機能により、ファイル編集時に自動的にフォーマット & lint が実行されます。

対応ファイル:

- Python (.py): Ruff でフォーマット + lint
- TypeScript/JavaScript (.ts, .js, .tsx, .jsx): Biome でフォーマット + lint
- Markdown (.md): Prettier + markdownlint
- YAML (.yml, .yaml): Prettier + yamllint
- Shell Script (.sh): shfmt + shellcheck
- SQL (.sql): SQLFluff
- Go (.go): gofmt + golangci-lint

### 必要なツール

```bash
# Python
brew install ruff

# Shell
brew install shellcheck shfmt

# YAML
brew install yamllint

# SQL
brew install sqlfluff

# Go（使用する場合）
brew install go golangci-lint

# TypeScript/JS/Markdown
# npx で自動ダウンロードされるためインストール不要
```

詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。
