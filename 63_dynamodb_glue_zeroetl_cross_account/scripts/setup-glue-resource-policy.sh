#!/bin/bash
# Setup Glue Catalog Resource Policy (Target Account)
#
# Prerequisites:
#   - Target Stack must be deployed first (Glue database must exist)
#   - Run with Target Account credentials
# AWS::Glue::ResourcePolicy has no CloudFormation support, so this is handled via CLI.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Use REGION from config.sh if set, otherwise use AWS CLI default
if [ -z "$REGION" ]; then
  REGION=$(aws configure get region)
fi

echo "=== Glue Catalog Resource Policy Setup ==="
echo "Target Account: ${TARGET_ACCOUNT_ID}"
echo "Source Account: ${SOURCE_ACCOUNT_ID}"
echo "Database:       ${DATABASE_NAME}"
echo "Region:         ${REGION}"
echo ""

CATALOG_ARN="arn:aws:glue:${REGION}:${TARGET_ACCOUNT_ID}:catalog"
DATABASE_ARN="arn:aws:glue:${REGION}:${TARGET_ACCOUNT_ID}:database/${DATABASE_NAME}"

POLICY_FILE=$(mktemp)
trap "rm -f ${POLICY_FILE}" EXIT

cat > "${POLICY_FILE}" << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGlueAuthorizeInboundIntegration",
      "Effect": "Allow",
      "Principal": { "Service": "glue.amazonaws.com" },
      "Action": "glue:AuthorizeInboundIntegration",
      "Resource": [
        "${CATALOG_ARN}",
        "${DATABASE_ARN}"
      ]
    },
    {
      "Sid": "AllowSourceAccountCreateInboundIntegration",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::${SOURCE_ACCOUNT_ID}:root" },
      "Action": "glue:CreateInboundIntegration",
      "Resource": [
        "${CATALOG_ARN}",
        "${DATABASE_ARN}"
      ]
    }
  ]
}
EOF

echo "Applying Glue Catalog Resource Policy..."
aws glue put-resource-policy --policy-in-json "file://${POLICY_FILE}" --region "${REGION}"

echo ""
echo "Done. Verify with: aws glue get-resource-policy --region ${REGION}"
