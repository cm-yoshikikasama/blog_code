#!/bin/bash
# Configuration for DynamoDB Zero-ETL Cross-Account Integration
# Edit these values before deployment
# NOTE: Keep PROJECT_NAME, ENV_NAME, and account IDs in sync with cdk/lib/parameter.ts

PROJECT_NAME="cm-kasama-dynamodb-zeroetl"
ENV_NAME="dev"
SOURCE_ACCOUNT_ID="111111111111"
TARGET_ACCOUNT_ID="222222222222"
UNNEST_SPEC="TOPLEVEL"
# REGION="us-east-1"  # Optional - defaults to AWS CLI region

# Derived values (do not edit)
DATABASE_NAME="${PROJECT_NAME//-/_}_${ENV_NAME}"
