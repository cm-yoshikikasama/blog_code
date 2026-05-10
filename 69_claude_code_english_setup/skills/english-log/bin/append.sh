#!/usr/bin/env bash
set -euo pipefail

# Silent appender for english_log.md.
# Usage:
#   append.sh grammar "<original>" "<corrected>" "<meaning>" "<example>"
#   append.sh vocab   "<original>" "<meaning>"  "<example>"

LOG_FILE="${ENGLISH_LOG_FILE:-./samples/english_log.md}"
TYPE="${1:?type (grammar|vocab) required}"
TODAY="$(TZ=Asia/Tokyo date +%F)"

next_id() {
  local section="$1"
  awk -v sec="## ${section}" '
    $0 == sec { in_sec=1; next }
    in_sec && /^## / { in_sec=0 }
    in_sec && /^\| [0-9]+ \|/ { gsub(/[| ]/, "", $2); last=$2 }
    END { print (last == "" ? 0 : last) + 1 }
  ' "$LOG_FILE"
}

insert_after_last_row_in_section() {
  local section="$1" row="$2" tmp
  tmp="$(mktemp)"
  awk -v section="## ${section}" -v row="$row" '
    { lines[NR] = $0 }
    END {
      in_sec = 0; last = 0
      for (i = 1; i <= NR; i++) {
        if (lines[i] == section) { in_sec = 1; continue }
        if (in_sec && lines[i] ~ /^## /) in_sec = 0
        if (in_sec && lines[i] ~ /^\| [0-9]+ \|/) last = i
      }
      for (i = 1; i <= NR; i++) {
        print lines[i]
        if (i == last) print row
      }
      if (last == 0) print row
    }
  ' "$LOG_FILE" > "$tmp"
  mv "$tmp" "$LOG_FILE"
}

case "$TYPE" in
  grammar)
    ORIG="${2:?original required}"; CORR="${3:?corrected required}"
    MEAN="${4:?meaning required}"; EXAMPLE="${5:?example required}"
    ID="$(next_id Grammar)"
    ROW="| ${ID} | ${ORIG} | ${CORR} | ${MEAN} | ${EXAMPLE} | ${TODAY} |"
    insert_after_last_row_in_section "Grammar" "$ROW"
    ;;
  vocab)
    ORIG="${2:?original required}"; MEAN="${3:?meaning required}"
    EXAMPLE="${4:-}"
    ID="$(next_id Vocab)"
    ROW="| ${ID} | ${ORIG} | ${MEAN} | ${EXAMPLE} | ${TODAY} |"
    insert_after_last_row_in_section "Vocab" "$ROW"
    ;;
  *)
    echo "unknown type: $TYPE" >&2
    exit 2
    ;;
esac
