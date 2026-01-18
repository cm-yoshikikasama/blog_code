---
name: commit-msg
description: Generate git commands (add, commit, push) ready to execute
allowed-tools: Bash(git status), Bash(git diff *), Bash(git log *)
disable-model-invocation: true
---

# Git Add, Commit, Push Command Generator

## Your task

1. Check git status and diff to understand changes
2. Analyze recent commits for style reference
3. Generate a single-line commit message
4. Output 3 executable git commands (add, commit, push)

### Step 1: Check Git Status and Changes

```bash
git status
git diff --cached
git diff
```

### Step 2: Analyze Recent Commits (for style reference)

```bash
git log --oneline -10
```

### Step 3: Generate Single-Line Commit Message

Generate a single-line commit message following these rules:

1. Format: `<type>: <description>`
   - Type: feat, fix, docs, style, refactor, test, chore, etc.
   - Description: concise summary of changes in English

2. Best Practices:
   - Use imperative mood ("add" not "added")
   - Keep under 72 characters
   - No period at end
   - Focus on what changed

### Step 4: Output Executable Commands

Output exactly 3 lines of executable git commands in a code block:

```bash
git add .
git commit -m "<generated commit message>"
git push
```

IMPORTANT:

- Do NOT execute the commands
- Only output the 3 command lines
- User can copy and execute them manually
