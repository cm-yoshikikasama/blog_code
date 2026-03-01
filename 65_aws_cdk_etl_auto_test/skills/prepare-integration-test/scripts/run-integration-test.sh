#!/bin/bash
# run-integration-test.sh — Ralph Loop runner
#
# Usage: run-integration-test.sh <workflow-file> [max-iterations]
#
# Invokes claude -p repeatedly. Each iteration processes one pending step
# and exits. If an async job is still running, it exits without waiting.
# After interruption, simply re-run the same command to resume.

set -euo pipefail

WORKFLOW_FILE="${1:-}"
MAX_ITERATIONS="${2:-100}"

if [[ -z "$WORKFLOW_FILE" || ! -f "$WORKFLOW_FILE" ]]; then
  echo "Usage: $0 <workflow-file> [max-iterations]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR=$(jq -r '.project' "$WORKFLOW_FILE")
WORKFLOW_FILE="$(cd "$(dirname "$WORKFLOW_FILE")" && pwd)/$(basename "$WORKFLOW_FILE")"
EVIDENCE_DIR=$(jq -r '.evidence_dir // "test-outputs/evidences/"' "$WORKFLOW_FILE")
LOG_FILE="$(dirname "$PROJECT_DIR/$EVIDENCE_DIR")/.workflow-log"
mkdir -p "$(dirname "$LOG_FILE")"
INTERVAL=$(jq '.interval // 60' "$WORKFLOW_FILE")
MODEL=$(jq -r '.model // "sonnet"' "$WORKFLOW_FILE")

# ---------------------------------------------------------------------------
# Allowed tools — deny-all, allow-listed only (AWS restricted by IAM role)
# ---------------------------------------------------------------------------
ALLOWED_TOOLS=(
  Read Write Edit Glob Grep
  'Bash(jq *)'  'Bash(cat *)'  'Bash(ls *)'
  'Bash(date)'  'Bash(diff *)' 'Bash(mkdir *)'
  'Bash(head *)' 'Bash(tail *)'
  'Bash(aws *)'  # AWS operations restricted by IAM role
)
ALLOWED_TOOLS_STR=$(IFS=,; echo "${ALLOWED_TOOLS[*]}")

: > "$LOG_FILE"

echo "=== Workflow Runner (Ralph Loop) ==="
echo "Workflow: $WORKFLOW_FILE"
echo "Model: $MODEL | Interval: ${INTERVAL}s | Max iterations: $MAX_ITERATIONS"
echo ""

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] --- Iteration $i/$MAX_ITERATIONS ---" | tee -a "$LOG_FILE"

  { echo "Workflow file: $WORKFLOW_FILE"; cat "$SCRIPT_DIR/../references/orchestrator-prompt.md"; } | \
    (cd "$PROJECT_DIR" && claude -p --model "$MODEL" --allowedTools "$ALLOWED_TOOLS_STR" \
      --output-format stream-json --verbose) >> "$LOG_FILE" 2>&1 || true

  # All steps completed?
  if jq -e '[.steps[].status] | all(. == "completed")' "$WORKFLOW_FILE" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] === All steps completed ===" | tee -a "$LOG_FILE"
    exit 0
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Waiting ${INTERVAL}s ..." | tee -a "$LOG_FILE"
  sleep "$INTERVAL"
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] === Max iterations ($MAX_ITERATIONS) reached ===" | tee -a "$LOG_FILE"
exit 1
