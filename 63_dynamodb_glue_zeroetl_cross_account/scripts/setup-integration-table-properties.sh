#!/bin/bash
# Setup Integration Table Properties (Target Account)
#
# Prerequisites:
#   - Target Stack must be deployed first (IntegrationResourceProperty must exist)
#   - Run with Target Account credentials
#   - Run BEFORE deploying the Integration Stack
# AWS::Glue::IntegrationTableProperties has no CloudFormation support, so this is handled via CLI.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Use REGION from config.sh if set, otherwise use AWS CLI default
if [ -z "$REGION" ]; then
  REGION=$(aws configure get region)
fi

echo "=== Integration Table Properties Setup ==="
echo "Table Name:   Orders"
echo "UnnestSpec:   ${UNNEST_SPEC}"
echo "Database:     ${DATABASE_NAME}"
echo "Region:       ${REGION}"
echo ""

echo "Creating integration table properties..."
aws glue create-integration-table-properties \
  --resource-arn "arn:aws:glue:${REGION}:${TARGET_ACCOUNT_ID}:database/${DATABASE_NAME}" \
  --table-name "Orders" \
  --target-table-config "{\"UnnestSpec\":\"${UNNEST_SPEC}\"}" \
  --region "${REGION}"

echo ""
echo "=== Verifying integration table properties ==="
aws glue get-integration-table-properties \
  --resource-arn "arn:aws:glue:${REGION}:${TARGET_ACCOUNT_ID}:database/${DATABASE_NAME}" \
  --table-name "Orders" \
  --region "${REGION}"
