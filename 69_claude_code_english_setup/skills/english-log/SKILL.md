---
name: english-log
description: Log English vocabulary and grammar mistakes to Markdown table. AUTO-TRIGGER (mandatory): whenever you output a "wrong: X / correct: Y" grammar correction block in a response, you MUST immediately invoke this skill via the Skill tool — do not skip. MANUAL: when the user explicitly calls /english-log.
argument-hint: "[word — meaning] or [wrong: <original> / correct: <corrected>]"
model: sonnet
allowed-tools: Read, Edit, AskUserQuestion
---

Skill to log English vocabulary and grammar mistakes to a Markdown table.

Log file: `./samples/english_log.md`

Read `references/INSTRUCTIONS.md` and follow the instructions.
