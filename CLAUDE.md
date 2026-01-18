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

## Detailed Guidelines

Refer to the following files for detailed project rules

- AWS CDK (TypeScript): @.claude/rules/cdk.md
- AWS Operations: @.claude/rules/aws-operations.md
- Python Lambda: @.claude/rules/python.md
- Development Workflow (Subagent usage, documentation updates): @.claude/rules/workflow.md
- Markdown Editing Rules: @.claude/rules/markdown.md
