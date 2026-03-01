#!/bin/bash
# credential-process-mfa.sh
#
# Wrapper script for AWS credential_process
# Retrieves an MFA token from 1Password CLI and returns temporary credentials via assume-role
#
# Usage (in ~/.aws/config):
#   [profile claude-code-dev]
#   credential_process = /path/to/credential-process-mfa.sh <role_arn> <mfa_serial> <source_profile>
#
# Temporary credentials are cached and reused while still valid
# Expired cache is overwritten on next invocation (self-managed lifecycle)

set -euo pipefail

# --- Arguments ---

CACHE_DIR="${HOME}/.aws/cli/cache"

ROLE_ARN="${1:?Usage: credential-process-mfa.sh <role_arn> <mfa_serial> <source_profile>}"
MFA_SERIAL="${2:?Usage: credential-process-mfa.sh <role_arn> <mfa_serial> <source_profile>}"
SOURCE_PROFILE="${3:?Usage: credential-process-mfa.sh <role_arn> <mfa_serial> <source_profile>}"

# --- Cache ---

CACHE_KEY=$(echo -n "${ROLE_ARN}:${MFA_SERIAL}" | shasum -a 256 | cut -c1-16)
CACHE_FILE="${CACHE_DIR}/credential-process-mfa-${CACHE_KEY}.json"

mkdir -p "$CACHE_DIR"
find "$CACHE_DIR" -name "credential-process-mfa-*.json" -mmin +60 -delete 2>/dev/null

if [[ -f "$CACHE_FILE" ]]; then
  EXP_STR=$(jq -r '.Expiration // empty' "$CACHE_FILE" 2>/dev/null)
  if [[ -n "$EXP_STR" ]]; then
    # Normalize timezone for BSD date: Z → +0000, +00:00 → +0000
    EXP_NORM=$(echo "$EXP_STR" | sed -E 's/Z$/+0000/; s/([+-][0-9]{2}):([0-9]{2})$/\1\2/')
    EXP_EPOCH=$(date -jf "%Y-%m-%dT%H:%M:%S%z" "$EXP_NORM" +%s 2>/dev/null) || EXP_EPOCH=0
    NOW_EPOCH=$(date +%s)
    REMAINING=$((EXP_EPOCH - NOW_EPOCH))
  else
    REMAINING=0
  fi

  if [[ "$REMAINING" -gt 300 ]]; then
    cat "$CACHE_FILE"
    exit 0
  fi
fi

# --- MFA Token ---

OTP=$(op item get "AWS" --otp 2>/dev/null) || {
  echo "Error: Failed to get OTP from 1Password CLI" >&2
  echo "Ensure 1Password CLI is signed in (run: eval \$(op signin))" >&2
  exit 1
}

# --- Assume Role ---

RESPONSE=$(aws sts assume-role \
  --role-arn "$ROLE_ARN" \
  --role-session-name "claude-code-$(date +%s)" \
  --serial-number "$MFA_SERIAL" \
  --token-code "$OTP" \
  --profile "$SOURCE_PROFILE" \
  --duration-seconds 3600 \
  --output json 2>&1) || {
  echo "Error: assume-role failed: $RESPONSE" >&2
  exit 1
}

# --- Format output (credential_process Version 1) ---

OUTPUT=$(echo "$RESPONSE" | jq '{
  Version: 1,
  AccessKeyId: .Credentials.AccessKeyId,
  SecretAccessKey: .Credentials.SecretAccessKey,
  SessionToken: .Credentials.SessionToken,
  Expiration: .Credentials.Expiration
}') || {
  echo "Error: Failed to parse assume-role response" >&2
  exit 1
}

(umask 077 && echo "$OUTPUT" > "$CACHE_FILE")

echo "$OUTPUT"
