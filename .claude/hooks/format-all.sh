#!/bin/bash
# Universal formatter and linter for all file types
# This script runs automatically via Claude Code PostToolUse hook

# Helper function to run command and limit output
run_cmd() {
  "$@" 2>&1 | head -20 || true
}

# Helper function to check if command exists
has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# Read JSON from stdin
input=$(cat)

# Extract file paths (supports both single file and MultiEdit)
# For MultiEdit: .tool_input.edits[].file_path
# For Write/Edit: .tool_input.file_path or .tool_input.path
FILES=$(echo "$input" | jq -r '
  if .tool_input.edits then
    .tool_input.edits[].file_path
  else
    .tool_input.file_path // .tool_input.path // ""
  end
' | sort -u)

# Process each file
while IFS= read -r FILE; do
  # Check if file exists
  if [[ ! -f "$FILE" ]] || [[ -z "$FILE" ]]; then
    continue
  fi

  # Skip certain directories
  if [[ "$FILE" =~ node_modules|__pycache__|\.venv|cdk\.out ]]; then
    continue
  fi

  # Determine file type and format/lint accordingly
  case "$FILE" in
  # TypeScript/JavaScript/JSON - Biome (format + lint)
  *.ts|*.tsx|*.js|*.jsx|*.json|*.jsonc)
    echo "[Biome] Formatting & Linting: $FILE" >&2
    run_cmd npx --yes @biomejs/biome check --write "$FILE"
    ;;

  # Python - Ruff (format + lint)
  *.py)
    echo "[Ruff] Formatting & Linting: $FILE" >&2
    if has_cmd ruff; then
      run_cmd ruff format "$FILE"
      run_cmd ruff check --fix "$FILE"
    elif has_cmd python3; then
      run_cmd python3 -m ruff format "$FILE"
      run_cmd python3 -m ruff check --fix "$FILE"
    else
      echo "[Ruff] Not installed. Install with: brew install ruff" >&2
    fi
    ;;

  # SQL - SQLFluff (format + lint)
  *.sql)
    echo "[SQLFluff] Formatting & Linting: $FILE" >&2
    if has_cmd sqlfluff; then
      run_cmd sqlfluff fix --force "$FILE"
      run_cmd sqlfluff lint "$FILE"
    else
      echo "[SQLFluff] Not installed. Install with: brew install sqlfluff" >&2
    fi
    ;;

  # Go - gofmt + golangci-lint
  *.go)
    if [[ ! "$FILE" =~ \.template\.go$ ]]; then
      echo "[Go] Formatting & Linting: $FILE" >&2
      if has_cmd gofmt; then
        run_cmd gofmt -w "$FILE"
      fi
      if has_cmd golangci-lint; then
        run_cmd golangci-lint run --fix "$FILE"
      fi
    fi
    ;;

  # Shell Script - shfmt + shellcheck
  *.sh)
    echo "[Shell] Formatting & Linting: $FILE" >&2
    if has_cmd shfmt; then
      run_cmd shfmt -w -i 2 -ci "$FILE"
    fi
    if has_cmd shellcheck; then
      run_cmd shellcheck "$FILE"
    fi
    ;;

  # YAML - Prettier + yamllint
  *.yml|*.yaml)
    echo "[YAML] Formatting & Linting: $FILE" >&2
    if has_cmd npx; then
      run_cmd npx --yes prettier --write "$FILE"
    fi
    if has_cmd yamllint; then
      run_cmd yamllint "$FILE"
    fi
    ;;

  # Markdown - Prettier + markdownlint
  *.md)
    echo "[Markdown] Formatting & Linting: $FILE" >&2
    if has_cmd npx; then
      run_cmd npx --yes prettier --write --prose-wrap never "$FILE"
      run_cmd npx --yes markdownlint-cli --fix "$FILE"
    fi
    ;;

  *)
    # Unknown file type, skip
    continue
    ;;
  esac
done <<< "$FILES"

exit 0
