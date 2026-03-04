#!/usr/bin/env python3
"""PreToolUse hook: validate Bash tool commands (default-deny policy).

Receives a JSON object on stdin:
  {"tool_name":"Bash","tool_input":{"command":"..."}}

Called via per-skill hooks defined in SKILL.md frontmatter.
Only active during /run-integration-test skill execution.

Outputs a Claude Code hook response on stdout when denying.
Exits 0 silently when the command is allowed.
"""

import json
import re
import shlex
import sys
from typing import NoReturn

SHELL_COMMANDS = {
    # File inspection
    "ls",
    "cat",
    "head",
    "tail",
    "wc",
    "diff",
    "find",
    "tree",
    # Shell basics
    "echo",
    "pwd",
    "date",
    "sleep",
    # Data processing
    "jq",
    "python",
    "grep",
    # Directory/file operations (non-destructive)
    "mkdir",
    "cp",
}

AWS_WRITE_COMMANDS = {
    "start-execution",  # Step Functions
    "start-job-run",  # Glue
    "start-query-execution",  # Athena
    "stop-query-execution",  # Athena
    "put-events",  # EventBridge
    "put-object",  # S3
    "copy-object",  # S3
    # S3 high-level commands
    "ls",
    "cp",
}

AWS_READ_PREFIXES = ("describe-", "list-", "get-", "head-", "filter-")

# shlex returns && and || as single tokens
OPERATORS = {"|", "||", "&", "&&", ";"}


def deny(message: str) -> NoReturn:
    print(json.dumps({"decision": "block", "reason": message}))
    sys.exit(0)


def check_aws(tokens: list) -> None:
    """Validate AWS CLI subcommand against the allow-list."""
    # Skip global flags (--flag or --flag value) to find: aws <service> <subcommand>
    non_flags = []
    skip_next = False
    for token in tokens:
        if skip_next:
            skip_next = False
            continue
        if token.startswith("--"):
            if "=" not in token:
                skip_next = True  # next token is the flag value
            continue
        non_flags.append(token)

    # non_flags: ["aws", "<service>", "<subcommand>", ...]
    if len(non_flags) < 3:
        return

    subcommand = non_flags[2]
    if any(subcommand.startswith(p) for p in AWS_READ_PREFIXES):
        return
    if subcommand in AWS_WRITE_COMMANDS:
        return

    deny(
        f"AWS subcommand '{subcommand}' is not in the allow-list. "
        f"Permitted: read prefixes {list(AWS_READ_PREFIXES)} "
        f"and write commands {sorted(AWS_WRITE_COMMANDS)}."
    )


def split_segments(tokens: list) -> list:
    """Split token list into command segments at shell operators."""
    segments = []
    current = []
    for token in tokens:
        if token in OPERATORS:
            if current:
                segments.append(current)
                current = []
        else:
            current.append(token)
    if current:
        segments.append(current)
    return segments


def validate_segment(tokens: list) -> None:
    """Validate a single command segment."""
    # Strip whitespace-only tokens (e.g. newline after && from shlex)
    tokens = [t for t in tokens if t.strip()]

    # Strip leading variable assignments (KEY=value)
    while tokens and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", tokens[0]):
        tokens = tokens[1:]

    if not tokens:
        return

    # Strip path prefix (e.g. /usr/bin/jq -> jq)
    cmd = tokens[0].rsplit("/", 1)[-1]

    if not cmd or cmd.startswith("#"):
        return

    if cmd == "aws":
        check_aws(tokens)
    elif cmd not in SHELL_COMMANDS:
        deny(
            f"Command '{cmd}' is not in the allow-list. "
            f"Permitted commands: {sorted(SHELL_COMMANDS)}"
        )


def main() -> None:
    data = json.load(sys.stdin)

    if data.get("tool_name") != "Bash":
        sys.exit(0)

    command = data.get("tool_input", {}).get("command", "")
    if not command:
        sys.exit(0)

    try:
        lex = shlex.shlex(command, posix=True, punctuation_chars=True)
        tokens = list(lex)
    except ValueError as e:
        deny(f"Could not parse command: {e}")

    for segment in split_segments(tokens):
        validate_segment(segment)


if __name__ == "__main__":
    main()
