# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a Japanese blog code repository containing AWS cloud technology tutorials and examples. Each numbered directory (e.g., `03_`, `34_`, `56_`) represents a complete, self-contained project for a specific blog post.

## Common Development Commands

### CDK Projects (in `/cdk/` subdirectories)
```bash
npm install                                                    # Install dependencies
npx cdk synth --profile <AWS_PROFILE>                        # Synthesize CloudFormation
npx cdk deploy --all --require-approval never --profile <AWS_PROFILE>  # Deploy all stacks
npx cdk deploy <STACK_NAME> --profile <AWS_PROFILE>          # Deploy specific stack
npx jest                                                      # Run unit tests
```

### Serverless Framework Projects
```bash
npm install -g serverless                                     # Install globally (if needed)
sls plugin install -n serverless-python-requirements         # Install Python plugin
AWS_SDK_LOAD_CONFIG=true AWS_PROFILE=<PROFILE> sls deploy   # Deploy with profile
sls logs -f <function-name> -t                              # Tail function logs
```

### Python Projects
```bash
pip install -r requirements.txt  # Standard pip installation
poetry install                   # For poetry-managed projects
```

## Architecture Patterns

### CDK Project Structure
```
cdk/
├── lib/
│   ├── constructs/          # Reusable CDK constructs
│   └── stack/              # Main stack definitions
├── parameter.ts            # Environment configuration (critical file)
├── package.json           # CDK dependencies
└── test/                  # Unit tests
```

### Lambda Function Structure
```
resources/
├── lambda/
│   ├── handler.py         # Main Lambda handler
│   └── lib/              # Shared utilities and helpers
└── requirements.txt      # Python dependencies
```

## Key Configuration Files

- **`parameter.ts`** - Contains environment variables, account IDs, and project configuration for CDK projects
- **`serverless.yml`** - Serverless Framework configuration with service definitions
- **CloudFormation YAML files** - Infrastructure templates for direct CloudFormation deployment

## AWS Services and Patterns

This codebase primarily demonstrates:
- **Data Engineering**: ETL pipelines with Glue, DMS migrations, data lake architectures
- **Serverless Applications**: Lambda functions with various triggers (S3, EventBridge, API Gateway)
- **Infrastructure as Code**: CDK constructs and CloudFormation templates
- **Multi-Account Deployments**: Cross-account IAM roles and resource access patterns

## Development Notes

- Each project directory is self-contained and can be deployed independently
- Documentation is primarily in Japanese, but code comments and variable names are in English
- Projects include production-ready IAM policies and security configurations
- Common pattern: infrastructure code + application code + comprehensive tests
- AWS profiles are used extensively - check `parameter.ts` or README files for required profile names