---
name: prepare-integration-test
description: Integration test preparation and re-test. Create test specifications from design docs/CDK code, verify prerequisites (credentials, infrastructure, test data), upload missing test data to S3, and generate workflow.json for Ralph Loop execution. Also supports re-test workflow generation after code fixes based on summary findings.
argument-hint: "[project-path]"
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

The project directory path is: $ARGUMENTS
Use this path as the `(project)` placeholder in all steps described in INSTRUCTIONS.md.

See [INSTRUCTIONS.md](references/INSTRUCTIONS.md) for detailed steps.
