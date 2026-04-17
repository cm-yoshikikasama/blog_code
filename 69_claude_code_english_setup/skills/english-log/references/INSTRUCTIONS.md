# english-log Instructions

Log file: `./samples/english_log.md`

The file has two Markdown tables under `## Grammar` and `## Vocab` sections.

## Input Parsing

When arguments are provided, auto-detect the type using the following rules:

- Contains `wrong:` (auto-trigger pattern) → `grammar`
  - After `wrong:` = original (incorrect expression)
  - After `correct:` = corrected (correct expression)
  - Example: `wrong: I have went / correct: I have gone` → type=grammar, original=I have went, corrected=I have gone, meaning=""
- Contains `→` or `->` (manual input pattern) → `grammar`
  - Left of `→` = original (incorrect expression)
  - Right of `→` = corrected (correct expression)
  - Text in parentheses or after = meaning (grammar rule explanation)
- Contains neither → `vocab`
  - First word/phrase = original
  - After `—` or `-` = meaning (definition)

When no arguments are provided, use AskUserQuestion (single call):

```text
header: "Type"
question: "Is this a vocabulary word (vocab) or a grammar mistake (grammar)?"
options: ["vocab", "grammar"]
```

For vocab:

```text
header: "Word"
question: "Enter the word/phrase and its meaning (e.g., ephemeral — temporary)"
```

For grammar:

```text
header: "Grammar"
question: "Enter: incorrect expression → correct expression (explanation) (e.g., I have went → I have gone (past participle))"
```

## Example Generation

Generate one concise example sentence from the meaning. Use the user's context if available.

## Markdown Table Write

1. Read the log file.
2. Find the last id in the target section (Grammar or Vocab).
3. Use Edit to append a new row at the end of the corresponding table.

### Grammar table columns

`| id | original | corrected | meaning | example | registered_at |`

### Vocab table columns

`| id | original | meaning | example | registered_at |`

### Date

Use today's date in `YYYY-MM-DD` format (JST).

## Completion Message

Display the logged entry concisely:

```text
Logged: [type] "original" → "corrected" — meaning
```
