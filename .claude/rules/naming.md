# Resource Naming Convention

Shared verification environments require a user-specific prefix to avoid resource name conflicts.

## Format

`cm-{username}-{project-short-name}`

## Examples (user: kasama)

| Resource | Pattern | Example |
|----------|---------|---------|
| projectName | `cm-{username}-{short}` | `cm-kasama-sf-zeroetl` |
| S3 Bucket | `{projectName}-{env}-datalake` | `cm-kasama-sf-zeroetl-dev-datalake` |
| Glue Database | `{projectName}_{env}` | `cm_kasama_sf_zeroetl_dev` |
| Secret | `{projectName}-credentials` | `cm-kasama-sf-zeroetl-credentials` |
| IAM Role | `{projectName}-{env}-{role}` | `cm-kasama-sf-zeroetl-dev-source-role` |

## Notes

- Replace `kasama` with your username (e.g., `cm-hirano-xxx`)
- Keep `{short}` concise (e.g., `sf-zeroetl` instead of `salesforce-glue-zeroetl`)
- Database names use underscores (AWS Glue requirement)
