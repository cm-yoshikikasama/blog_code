#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# Use REGION from config.sh if set, otherwise use AWS CLI default
if [ -z "$REGION" ]; then
  REGION=$(aws configure get region)
fi
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Setting Glue Catalog Resource Policy (Database: ${DATABASE_NAME})..."

# Glue Resource Policy has no CloudFormation support - must use CLI
cat > /tmp/catalog-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "glue.amazonaws.com" },
      "Action": "glue:AuthorizeInboundIntegration",
      "Resource": "arn:aws:glue:${REGION}:${ACCOUNT_ID}:database/${DATABASE_NAME}"
    },
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::${ACCOUNT_ID}:root" },
      "Action": "glue:CreateInboundIntegration",
      "Resource": "arn:aws:glue:${REGION}:${ACCOUNT_ID}:database/${DATABASE_NAME}"
    }
  ]
}
EOF

aws glue put-resource-policy --policy-in-json file:///tmp/catalog-policy.json
rm -f /tmp/catalog-policy.json

echo "Done."
