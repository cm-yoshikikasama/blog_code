#!/bin/bash
# Formatter and linter for CDK + Python Lambda project
# This script runs automatically via Claude Code PostToolUse hook

# Helper function to run command and limit output
run_cmd() {
  "$@" 2>&1 | head -20 || true
}

# Helper function to check if command exists
has_cmd() {
  command -v "$1" >/dev/null 2>&1
}
input=$(cat)

# Extract file paths (supports both single file and MultiEdit)
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
    echo "[Biome] Formatting: $FILE" >&2
    run_cmd pnpm exec biome check --write "$FILE"
    ;;

  # Python - Ruff (format + lint)
  *.py)
    echo "[Ruff] Formatting: $FILE" >&2
    if has_cmd ruff; then
      run_cmd ruff format "$FILE"
      run_cmd ruff check --fix "$FILE"
    elif has_cmd python3; then
      run_cmd python3 -m ruff format "$FILE"
      run_cmd python3 -m ruff check --fix "$FILE"
    fi
    ;;

  # SQL - SQLFluff (format + lint)
  *.sql)
    echo "[SQLFluff] Formatting: $FILE" >&2
    if has_cmd sqlfluff; then
      run_cmd sqlfluff fix --force "$FILE"
      run_cmd sqlfluff lint "$FILE"
    fi
    ;;

  # YAML - Prettier + yamllint
  *.yml|*.yaml)
    echo "[YAML] Formatting: $FILE" >&2
    if has_cmd pnpm; then
      run_cmd pnpm exec prettier --write "$FILE"
    fi
    if has_cmd yamllint; then
      run_cmd yamllint "$FILE"
    fi
    ;;

  # Markdown - Prettier + markdownlint
  *.md)
    echo "[Markdown] Formatting: $FILE" >&2
    if has_cmd pnpm; then
      run_cmd pnpm exec prettier --write --prose-wrap never "$FILE"
      run_cmd pnpm exec markdownlint --fix "$FILE"
    fi
    ;;
  esac
done <<< "$FILES"

exit 0
