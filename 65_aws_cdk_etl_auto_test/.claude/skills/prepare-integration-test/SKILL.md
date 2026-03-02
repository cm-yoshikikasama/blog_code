---
name: prepare-integration-test
description: Integration test preparation. Create test specs, verify prerequisites, upload test data, generate workflow.json.
argument-hint: "[project-path]"
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

The project directory path is: $ARGUMENTS
Use this path as the `(project)` placeholder in all steps described in INSTRUCTIONS.md.

See [INSTRUCTIONS.md](references/INSTRUCTIONS.md) for detailed steps.
