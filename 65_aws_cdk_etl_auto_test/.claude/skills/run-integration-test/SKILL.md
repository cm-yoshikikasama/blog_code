---
name: run-integration-test
description: Execute integration tests from workflow.json. Runs in --permission-mode dontAsk inside devcontainer. permissions.allow in settings.local.json enforces the safety policy.
argument-hint: "[project-path]"
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
disable-model-invocation: true
---

The project directory path is: $ARGUMENTS
Use this path to locate workflow.json at `(project)/workflow.json`.

See [INSTRUCTIONS.md](references/INSTRUCTIONS.md) for detailed steps.
