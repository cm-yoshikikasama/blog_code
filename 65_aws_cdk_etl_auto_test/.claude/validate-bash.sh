#!/usr/bin/env bash
# PreToolUse hook: validate Bash tool commands (default-deny policy).
#
# Receives a JSON object on stdin:
#   {"tool_name":"Bash","tool_input":{"command":"..."}}
#
# Only active when CLAUDE_STRICT_HOOKS=1 (i.e. --dangerously-skip-permissions mode).
# In normal mode, permissions.deny handles safety so this hook is a no-op.
#
# Outputs a Claude Code hook response on stdout when denying.
# Exits 0 silently when the command is allowed.

set -euo pipefail

# ---------------------------------------------------------------------------
# Skip all validation in normal mode.
# In normal mode, permissions.deny already blocks dangerous commands.
# This hook is only needed in --dangerously-skip-permissions mode where
# hooks are the sole safety guardrail (launch with CLAUDE_STRICT_HOOKS=1).
# ---------------------------------------------------------------------------
if [[ "${CLAUDE_STRICT_HOOKS:-}" != "1" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# AWS CLI allow-list
# ---------------------------------------------------------------------------

# Exact-match subcommands (writes + S3 high-level)
AWS_WRITE_COMMANDS=(
  start-execution       # Step Functions
  start-job-run         # Glue
  start-query-execution # Athena
  stop-query-execution  # Athena
  put-events            # EventBridge
  put-object            # S3
  copy-object           # S3
  # S3 high-level commands (aws s3 <subcommand>)
  ls                    # S3 list
  cp                    # S3 copy
)

# Prefix-match subcommands (reads)
AWS_READ_PREFIXES=(
  describe-
  list-
  get-
  head-
  filter-
)

# ---------------------------------------------------------------------------
# Shell command allow-list
# ---------------------------------------------------------------------------

# Non-AWS commands allowed in strict mode
SHELL_COMMANDS=(
  # File inspection
  ls cat head tail wc diff find tree
  # Shell basics
  echo pwd date sleep
  # Data processing
  jq python grep
  # Directory/file operations (non-destructive)
  mkdir cp
)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

deny() {
  local message="$1"
  printf '{"decision":"block","reason":"%s"}' \
    "$(printf '%s' "$message" | sed 's/"/\\"/g')"
  exit 0
}

# Check if a value exists in an array
# Usage: in_array "value" "${array[@]}"
in_array() {
  local needle="$1"; shift
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

# Validate AWS CLI subcommands against the allow-list.
# Returns 0 if all subcommands are allowed, calls deny() otherwise.
check_aws() {
  local command="$1"

  mapfile -t subcommands < <(
    printf '%s' "$command" \
      | grep -oE '\baws(\s+--[^ ]+)*\s+[a-z][a-z0-9-]+\s+[a-z][a-z0-9-]+' \
      | awk '{print $NF}'
  )

  for subcommand in "${subcommands[@]}"; do
    [[ -z "$subcommand" ]] && continue

    allowed=false

    # Check read prefixes
    for prefix in "${AWS_READ_PREFIXES[@]}"; do
      if [[ "$subcommand" == "$prefix"* ]]; then
        allowed=true
        break
      fi
    done

    # Check explicit write allow-list
    if [[ "$allowed" == false ]]; then
      if in_array "$subcommand" "${AWS_WRITE_COMMANDS[@]}"; then
        allowed=true
      fi
    fi

    if [[ "$allowed" == false ]]; then
      deny "AWS subcommand '${subcommand}' is not in the allow-list. Permitted: read prefixes (${AWS_READ_PREFIXES[*]}) and write commands (${AWS_WRITE_COMMANDS[*]})."
    fi
  done
}

# ---------------------------------------------------------------------------
# Extract the first command token from a (potentially compound) command string.
# Handles: pipes, &&, ||, ;, subshells, env var assignments, sudo, etc.
# Returns the base command name (without path).
# ---------------------------------------------------------------------------
extract_first_command() {
  local cmd="$1"
  # Strip leading whitespace
  cmd="${cmd#"${cmd%%[![:space:]]*}"}"
  # Strip env var assignments (VAR=val ...)
  while [[ "$cmd" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; do
    cmd="${cmd#*=}"
    # Skip the value (quoted or unquoted)
    if [[ "$cmd" =~ ^\"([^\"]*)\" ]]; then
      cmd="${cmd#*\"}" ; cmd="${cmd#*\"}"
    elif [[ "$cmd" =~ ^\'([^\']*)\' ]]; then
      cmd="${cmd#*\'}" ; cmd="${cmd#*\'}"
    elif [[ "$cmd" == \$\(* ]]; then
      # Command substitution: strip $( and parse the inner command
      cmd="${cmd#\$\(}"
    else
      cmd="${cmd#*[[:space:]]}"
    fi
    cmd="${cmd#"${cmd%%[![:space:]]*}"}"
  done
  # Strip command substitution wrapper if still present
  cmd="${cmd#\$\(}"
  # Get the first token
  local first_token
  first_token="${cmd%% *}"
  # Strip path prefix (e.g. /usr/bin/jq → jq)
  first_token="${first_token##*/}"
  printf '%s' "$first_token"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# Read JSON from stdin
input=$(cat)

# Only inspect Bash tool calls
tool_name=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null || true)
if [[ "$tool_name" != "Bash" ]]; then
  exit 0
fi

command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

# --- Default-deny: validate every command segment ---

# Join backslash-newline continuations into single lines, then split
# compound commands on &&, ||, ;, | and check each segment
normalized="${command//$'\\\n'/ }"

# Neutralize content inside quotes before splitting to avoid breaking on
# | inside jq filters etc. (e.g. jq '.[] | select(...)' → jq '_')
safe=$(printf '%s' "$normalized" | sed "s/'[^']*'/'_'/g; s/\"[^\"]*\"/\"_\"/g")

while IFS= read -r segment; do
  [[ -z "$segment" ]] && continue
  # Strip leading/trailing whitespace
  segment="${segment#"${segment%%[![:space:]]*}"}"
  segment="${segment%"${segment##*[![:space:]]}"}"
  [[ -z "$segment" ]] && continue
  # Skip shell comments
  [[ "$segment" == "#"* ]] && continue

  first_cmd=$(extract_first_command "$segment")
  [[ -z "$first_cmd" ]] && continue

  if [[ "$first_cmd" == "aws" ]]; then
    # AWS CLI: validate subcommands
    check_aws "$segment"
  else
    # Generic command: check against allow-list
    if ! in_array "$first_cmd" "${SHELL_COMMANDS[@]}"; then
      deny "Command '${first_cmd}' is not in the allow-list. Permitted commands: ${SHELL_COMMANDS[*]}"
    fi
  fi
done < <(printf '%s\n' "$safe" | sed 's/&&/\n/g; s/||/\n/g; s/;/\n/g; s/|/\n/g')

exit 0
