#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

echo "Deleting: ${CONNECTION_NAME}, Catalog Resource Policy"
read -p "Continue? (y/N): " confirm
[[ ! "$confirm" =~ ^[Yy]$ ]] && exit 0

aws glue delete-connection --connection-name "${CONNECTION_NAME}" 2>&1 || true
aws glue delete-resource-policy 2>&1 || true

echo "Done. Next: cd cdk && pnpm run cdk destroy"
