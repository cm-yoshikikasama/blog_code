"""Unit tests for the sanitize helpers in handler.py.

Fixtures are modeled on real OTel events sampled from the raw log group.
PII (user.email, user.id, organization.id, etc.) is replaced with
placeholders; structure (key names, value types) matches real events.
"""

import json
import os
import sys
from pathlib import Path

import pytest

os.environ.setdefault("SANITIZED_LOG_GROUP", "test-log-group")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from handler import (
    _filter_tool_parameters,  # noqa: E402  # pyright: ignore[reportMissingImports]
    _sanitize,  # noqa: E402  # pyright: ignore[reportMissingImports]
)

REAL_RESOURCE_ATTRS = {
    "host.arch": "arm64",
    "os.type": "darwin",
    "user.plan": "max-5x",
    "service.name": "claude-code",
    "service.version": "2.1.121",
    "os.version": "25.3.0",
}

REAL_API_REQUEST_ATTRS = {
    "cost_usd": "0.3264025",
    "query_source": "repl_main_thread",
    "user.id": "hash-placeholder",
    "user.account_uuid": "uuid-placeholder",
    "terminal.type": "ghostty",
    "event.name": "api_request",
    "effort": "high",
    "cache_read_tokens": "628775",
    "event.timestamp": "2026-05-10T10:33:55.472Z",
    "input_tokens": "3",
    "speed": "normal",
    "prompt.id": "prompt-id-placeholder",
    "duration_ms": "16986",
    "event.sequence": 2116,
    "user.email": "user@example.com",
    "organization.id": "org-placeholder",
    "cache_creation_tokens": "104",
    "model": "claude-opus-4-6",
    "output_tokens": "454",
    "user.account_id": "account-placeholder",
    "request_id": "req-placeholder",
    "session.id": "session-placeholder",
}


def _event(body="claude_code.api_request", attributes=None, resource_attributes=None):
    return json.dumps(
        {
            "resource": {
                "attributes": resource_attributes
                if resource_attributes is not None
                else REAL_RESOURCE_ATTRS
            },
            "body": body,
            "attributes": attributes if attributes is not None else {},
        }
    )


@pytest.mark.parametrize(
    "tp,tool_name",
    [
        ("not-json", "Agent"),
        (json.dumps({"prompt": "secret"}), "Agent"),
        (json.dumps({"args": {"token": "secret"}}), "mcp_tool"),
    ],
    ids=["invalid-json", "agent-missing-subagent_type", "mcp-missing-server_name"],
)
def test_filter_tool_parameters_returns_none(tp, tool_name):
    """Unit-level negative branches not reachable via the integration test:
    invalid JSON (except path), Agent branch without subagent_type, mcp
    branch without server_name.
    """
    assert _filter_tool_parameters(tp, tool_name) is None


def test_sanitize_invalid_json_returns_none():
    """Invalid raw message → None so the caller skips the event."""
    assert _sanitize("not-json") is None


def test_sanitize_filters_real_api_request_event():
    """Golden path: a realistic api_request event is filtered to the allowlist
    on both attributes and resource.attributes. Exact-dict equality also
    proves PII / internal IDs (user.id, request_id, host.arch, os.type, ...)
    don't leak through.
    """
    result = _sanitize(_event(attributes=REAL_API_REQUEST_ATTRS))
    assert result["body"] == "claude_code.api_request"
    assert result["attributes"] == {
        "cost_usd": "0.3264025",
        "cache_read_tokens": "628775",
        "input_tokens": "3",
        "model": "claude-opus-4-6",
        "user.email": "user@example.com",
        "session.id": "session-placeholder",
    }
    assert result["resource"]["attributes"] == {
        "user.plan": "max-5x",
        "service.name": "claude-code",
        "service.version": "2.1.121",
    }


@pytest.mark.parametrize(
    "tool_name,tool_parameters,expected_params",
    [
        (
            "Agent",
            {"prompt": "secret", "subagent_type": "Explore"},
            {"subagent_type": "Explore"},
        ),
        (
            "mcp_tool",
            {"mcp_server_name": "qmd", "mcp_tool_name": "get"},
            {"mcp_server_name": "qmd"},
        ),
        ("Bash", {"bash_command": "rm", "full_command": "rm -rf /etc/passwd"}, None),
        ("Skill", {"skill_name": "common:create-drawio"}, None),
    ],
    ids=[
        "Agent-passes-subagent_type",
        "mcp-passes-server_name",
        "Bash-dropped",
        "Skill-dropped",
    ],
)
def test_sanitize_handles_tool_parameters_per_tool(
    tool_name, tool_parameters, expected_params
):
    """End-to-end across all four production tool categories. Agent and
    mcp_tool keep a safe subset; Bash and Skill drop tool_parameters
    entirely. tool_input is always dropped via the top-level ATTRS allowlist
    regardless of tool. Kept-cases also pin compact-JSON output.
    """
    attrs = {
        "tool_name": tool_name,
        "tool_parameters": json.dumps(tool_parameters),
        "tool_input": '{"prompt": "should be dropped"}',
    }
    result = _sanitize(_event(body="claude_code.tool_result", attributes=attrs))
    assert "tool_input" not in result["attributes"]
    if expected_params is None:
        assert "tool_parameters" not in result["attributes"]
        return
    tp_str = result["attributes"]["tool_parameters"]
    assert json.loads(tp_str) == expected_params
    assert " " not in tp_str


def test_sanitize_handles_missing_attributes_and_resource():
    """Missing `attributes` / `resource` keys must not crash — `or {}` fallback."""
    result = _sanitize(json.dumps({"body": "claude_code.user_prompt"}))
    assert result == {
        "body": "claude_code.user_prompt",
        "attributes": {},
        "resource": {"attributes": {}},
    }
