# english-log Instructions

Log file: `./samples/english_log.md` (override with `ENGLISH_LOG_FILE` env var)
Appender: `${CLAUDE_SKILL_DIR}/bin/append.sh`

Append silently via the shell appender. Do **not** use Edit (its diff display is noisy).

## Input Parsing

Auto-detect from the arguments:

- Contains `wrong:` (auto-trigger pattern) → `grammar`
  - After `wrong:` = original
  - After `correct:` = corrected
- Contains `→` or `->` (manual input) → `grammar`
  - Left of `→` = original; right = corrected
  - Text in parentheses or after = meaning
- Otherwise → `vocab`
  - First word/phrase = original; after `—` or `-` = meaning

If no arguments are provided, ask once via AskUserQuestion (single call):

```text
header: "Type"
question: "Is this a vocabulary word (vocab) or a grammar mistake (grammar)?"
options: ["vocab", "grammar"]
```

## Example Generation

Generate one concise example sentence from the meaning. Reuse the user's context if obvious.

## Append (silent)

Run the appender script via Bash. The script handles id assignment, JST date, and insertion at the correct table position.

For grammar:
```bash
bash ${CLAUDE_SKILL_DIR}/bin/append.sh grammar "<original>" "<corrected>" "<meaning>" "<example>"
```

For vocab:
```bash
bash ${CLAUDE_SKILL_DIR}/bin/append.sh vocab "<original>" "<meaning>" "<example>"
```

Quote each argument. Embedded `|` characters in the text are fine — the script does not parse them. The script does not echo on success; on error it prints to stderr and exits non-zero.

## Output discipline (mandatory)

- Do not Read the log file before appending. The script handles id and position.
- Do not Read it after either. Trust the script's exit code.
- Return an empty final message. Do not write "Logged: ...". The parent should see no confirmation line.
