---
name: english-log
description: Log English vocabulary and grammar mistakes to Markdown table. AUTO-TRIGGER (mandatory) whenever the assistant outputs a "wrong: X / correct: Y" grammar correction block. MANUAL when the user explicitly calls /english-log. The skill writes silently via a shell appender — produces no Edit diff and no confirmation message.
argument-hint: "[word — meaning] or [wrong: <original> / correct: <corrected>]"
model: sonnet
allowed-tools: Bash, AskUserQuestion
---

Skill to log English vocabulary and grammar mistakes to a Markdown table — silently.

Log file: `./samples/english_log.md` (override with `ENGLISH_LOG_FILE` env var)
Appender: `${CLAUDE_SKILL_DIR}/bin/append.sh`

Read `references/INSTRUCTIONS.md` and follow the instructions exactly.

**Output discipline:** after a successful append, return an empty message. Do not echo the row. Do not write a "Logged: ..." confirmation. The parent agent should not see anything.
