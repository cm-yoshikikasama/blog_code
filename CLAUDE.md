# CLAUDE.md

AWS CDK (TypeScript) + Python project. Contains Claude Code best practices and implementation samples.

## Project Structure

```text
.
├── docs/                          # Reference materials (attachments, usually not needed)
└── sample_*/                      # Sample projects
    ├── cdk/                       # CDK infrastructure code (TypeScript)
    │   ├── lib/                   # Stack definitions
    │   ├── bin/                   # CDK app entry point
    │   └── package.json
    ├── resources/                 # Python code (Lambda, Glue, etc.) or data files
    └── sql/                       # SQL scripts (as needed)
```
