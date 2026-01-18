---
paths: "**/cdk/**/*.ts"
---

# AWS CDK (TypeScript)

## Dependencies and Build

```bash
cd <project>/cdk
pnpm install                       # First time only
pnpm run build                     # TypeScript type checking
```

## CDK Operations

```bash
pnpm run cdk synth                 # Generate CloudFormation template
pnpm run cdk diff                  # Review changes before deployment
pnpm run cdk deploy                # Deploy stack
pnpm run cdk deploy --all          # Deploy all stacks
pnpm run cdk destroy               # Delete stack
```

## Guidelines

- Always run `pnpm run build` for type checking before running `cdk synth`
- Stack definitions must be placed in `cdk/lib/`
- Never hardcode AWS credentials or account IDs. Use `process.env.CDK_DEFAULT_ACCOUNT` or context instead
- Never use TypeScript `any` type. Use explicit type definitions when type inference is difficult
- Never use npm or npx. Use pnpm and pnpm exec instead
- `cdk deploy` and `cdk destroy` are executed by the user, not by AI (restricted in settings.json)
