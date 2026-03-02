---
name: run-integration-test
description: Execute integration tests from workflow.json. Must run in --dangerously-skip-permissions session. PreToolUse hooks enforce safety via default-deny policy.
argument-hint: "[project-path]"
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
disable-model-invocation: true
---

The project directory path is: $ARGUMENTS
Use this path to locate workflow.json at `(project)/workflow.json`.

See [INSTRUCTIONS.md](references/INSTRUCTIONS.md) for detailed steps.
