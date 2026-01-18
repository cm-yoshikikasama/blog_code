# Blog Post Plan: Salesforce to S3 Zero-ETL Integration

## Task Overview

Write a technical blog post (in Japanese, following blog_sample.md format) about implementing Salesforce to S3 data integration using AWS Glue Zero-ETL with CDK.

## Blog Structure

### 1. Introduction (はじめに)

- Author introduction (データ事業本部のkasamaです)
- Brief overview: AWS Glue Zero-ETLを使ってSalesforceからS3へデータ連携する仕組みをAWS CDKで実装

### 2. Background and Approach Selection (前提)

#### AppFlow vs Zero-ETL Comparison

| Aspect | Amazon AppFlow | AWS Glue Zero-ETL |
|--------|---------------|-------------------|
| Use Case | Low-code SaaS integrations | Near real-time ETL |
| Salesforce Support | Bidirectional (source and destination) | Source only |
| Data Format | Various (Parquet, JSON, CSV) | Iceberg (ACID transactions) |
| Entry Price | $0.02/flow run | $0.44/hour |
| Features | 14+ data sources, visual interface | CDC, incremental sync, time travel |
| Latency | Scheduled or event-driven | Continuous sync (15min minimum) |

#### Why Zero-ETL was chosen

- Iceberg format provides ACID transactions and time travel
- Near real-time data availability (configurable to 15 minutes)
- Better suited for data lake architecture
- Change Data Capture (INSERT/UPDATE/DELETE)

#### AWS Managed App vs Customer Managed App

- Customer Managed App: Full IaC possible but requires manual OAuth token management
- AWS Managed App (chosen): Simple browser-based OAuth, AWS handles token refresh automatically
- Trade-off: Console step required but significantly simpler

#### Secrets Manager Auto-Rotation Limitation

- Reference article: https://dev.classmethod.jp/articles/update-aws-secrets-manager-managed-external-secrets/
- Secrets Manager now supports managed external secrets for Salesforce
- However, Glue Connection does not yet support this automatic rotation feature
- Currently, AWS handles token refresh through AWS Managed App approach instead

### 3. Architecture (アーキテクチャ)

- Include diagram: `generated-diagrams/salesforce-glue-zeroetl-architecture.png`
- Explain hybrid approach reasoning

Resource ownership by deployment method:

| Resource | Method | Reason |
|----------|--------|--------|
| S3 Bucket | CloudFormation | Database LocationUri depends on it |
| Source Role | CloudFormation | Needed before Console Connection |
| Glue Database | CloudFormation | Needed before CDK Integration |
| Salesforce Connection | AWS Console | AWS Managed App requires browser OAuth |
| Catalog Resource Policy | Shell Script | No CloudFormation support |
| Target Role | CDK | Only needed at Integration creation |
| Integration | CDK | Final integration resource |

### 4. Implementation (実装)

#### Project Structure

```text
59_salesforce_glue_zeroetl/
├── cdk/                    # CDK infrastructure code
│   ├── bin/app.ts
│   ├── lib/
│   │   ├── parameter.ts
│   │   └── main-stack.ts
├── cfn/
│   └── prerequisites.yaml  # CloudFormation prerequisites
├── scripts/
│   ├── config.sh
│   ├── setup-prereqs.sh
│   └── cleanup-prereqs.sh
└── README.md
```

#### Key Implementation Files to Include

1. cfn/prerequisites.yaml (S3, Source Role, Glue Database, Secrets Manager)
2. scripts/setup-prereqs.sh (Catalog Resource Policy)
3. cdk/lib/main-stack.ts (Target Role, Integration Resource Properties, Zero-ETL Integration)
4. cdk/lib/parameter.ts (Configuration)

### 5. Deployment Steps (デプロイ)

1. Deploy CloudFormation prerequisites
2. Create Salesforce Connection in AWS Console
3. Run setup-prereqs.sh for Catalog Resource Policy
4. CDK deploy

### 6. Verification (デプロイ後確認)

- Check Integration status in Glue Console
- Query data with Athena
- Test INSERT/UPDATE/DELETE sync

### 7. Conclusion (最後に)

- Summary of what was accomplished
- Key learnings

### 8. References (参考)

Official Documentation URLs:

- AWS Glue Zero ETL: https://docs.aws.amazon.com/glue/latest/dg/zero-etl-using.html
- Create connections to SaaS sources: https://docs.aws.amazon.com/glue/latest/dg/creating-connections.html
- CDK CfnIntegration: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnIntegration.html
- CDK CfnIntegrationResourceProperty: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_glue.CfnIntegrationResourceProperty.html
- CloudFormation AWS::Glue::Integration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-glue-integration.html
- GitHub Repository: https://github.com/cm-yoshikikasama/blog_code/tree/main/59_salesforce_glue_zeroetl

## Files to Modify

- `/Users/kasama.yoshiki/Documents/git/blog_code/BLOG_TEMPLATE.md` - Write the complete blog post in Japanese

## Source Files to Reference

- `/Users/kasama.yoshiki/Documents/git/blog_code/59_salesforce_glue_zeroetl/cdk/lib/main-stack.ts`
- `/Users/kasama.yoshiki/Documents/git/blog_code/59_salesforce_glue_zeroetl/cfn/prerequisites.yaml`
- `/Users/kasama.yoshiki/Documents/git/blog_code/59_salesforce_glue_zeroetl/scripts/setup-prereqs.sh`
- `/Users/kasama.yoshiki/Documents/git/blog_code/59_salesforce_glue_zeroetl/cdk/lib/parameter.ts`
- `/Users/kasama.yoshiki/Documents/git/blog_code/59_salesforce_glue_zeroetl/README.md`

## Key Points to Emphasize

1. Why Zero-ETL over AppFlow (Iceberg format, near real-time, ACID transactions, CDC)
2. Why AWS Managed App over Customer Managed App (simplicity vs full IaC)
3. Secrets Manager auto-rotation limitation with Glue Connection
4. Hybrid deployment approach rationale (each resource with most appropriate method)
5. Catalog Resource Policy requirement (no CloudFormation support)
6. Cost considerations

## Markdown Rules

- Follow .claude/rules/markdown.md
- No bold notation (`**text**`)
- No emojis
- No colons at end of sentences
- Language tags for all code blocks (`typescript`, `yaml`, `bash`, `sql`, `text`)
- Blank lines before/after headings and lists
