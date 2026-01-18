#!/bin/bash
# Configuration for Salesforce Zero-ETL Integration
# Edit these values before deployment

PROJECT_NAME="my-sf-zeroetl"
ENV_NAME="dev"
# REGION="us-east-1"  # Optional - defaults to AWS CLI region

# Derived values (do not edit)
DATABASE_NAME="${PROJECT_NAME//-/_}_${ENV_NAME}"
CONNECTION_NAME="${PROJECT_NAME}-${ENV_NAME}-salesforce-connection"
