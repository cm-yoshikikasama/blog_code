# Blog_Code

Repository for publishing source code introduced in blog posts.

## Features

- AWS CDK: Infrastructure code in TypeScript
- Serverless: Implementation examples for Lambda, Glue, Step Functions, etc.
- Auto format and lint: Automatically executed on edit via Claude Code hooks

## Development Environment

### Pre-commit

This repository uses [pre-commit](https://pre-commit.com/) to run automated checks on every commit.

Setup:

```bash
brew install pre-commit gitleaks
pre-commit install
```

Included hooks:

- check-json, check-yaml, trailing-whitespace, end-of-file-fixer (general)
- gitleaks (secret leak detection)
- biome-check (TypeScript/JavaScript)
- ruff, ruff-format (Python)
- sqlfluff-lint (SQL)

To run all hooks manually:

```bash
pre-commit run --all-files
```

### Auto Format and Lint (Claude Code)

This repository automatically executes format and lint on file edit via Claude Code hooks feature.

Supported files:

- Python (.py): Format + lint with Ruff
- TypeScript/JavaScript (.ts, .js, .tsx, .jsx): Format + lint with Biome
- Markdown (.md): Prettier + markdownlint
- YAML (.yml, .yaml): Prettier + yamllint
- Shell Script (.sh): shfmt + shellcheck
- SQL (.sql): SQLFluff
- Go (.go): gofmt + golangci-lint

### Required Tools

```bash
# Python
brew install ruff

# Shell
brew install shellcheck shfmt

# YAML
brew install yamllint

# SQL
brew install sqlfluff

# Go (if used)
brew install go golangci-lint

# TypeScript/JS/Markdown
# No installation required - auto downloaded via npx
```

See [CLAUDE.md](./CLAUDE.md) for details.
