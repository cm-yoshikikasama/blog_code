"""Claude Code OTel log sanitizer.

Triggered by CloudWatch Logs subscription filter on the raw OTel log group.
Filters each event through an allowlist and writes the result to the sanitized
log group. Anything outside the allowlist (tool_input, prompt body, bash
commands, file contents, paths, etc.) is dropped here.

Allowlist matches the fields used by the dashboard widgets defined in
cfn/claude-otel-logs.yml. Adding a new widget that needs a new field requires
updating both ATTRS/RES_ATTRS below and the widget query.
"""

import base64
import gzip
import json
import os

import boto3

logs = boto3.client("logs")
LOG_GROUP = os.environ["SANITIZED_LOG_GROUP"]
LOG_STREAM = "sanitized"

ATTRS = {
    "cost_usd",
    "user.email",
    "session.id",
    "tool_name",
    "input_tokens",
    "cache_read_tokens",
    "model",
    "skill.name",
}

RES_ATTRS = {
    "user.plan",
    "service.name",
    "service.version",
}


def _filter_tool_parameters(tp_str, tool_name):
    """Keep only subagent_type (Agent tool) or mcp_server_name (mcp_tool)."""
    if not tp_str:
        return None
    try:
        tp = json.loads(tp_str)
    except (TypeError, ValueError):
        return None
    if tool_name == "Agent" and "subagent_type" in tp:
        return json.dumps({"subagent_type": tp["subagent_type"]}, separators=(",", ":"))
    if tool_name == "mcp_tool" and "mcp_server_name" in tp:
        return json.dumps(
            {"mcp_server_name": tp["mcp_server_name"]}, separators=(",", ":")
        )
    return None


def _sanitize(message):
    try:
        record = json.loads(message)
    except (TypeError, ValueError):
        return None

    attrs = record.get("attributes") or {}
    tool_name = attrs.get("tool_name", "")
    out_attrs = {k: v for k, v in attrs.items() if k in ATTRS}

    tp = _filter_tool_parameters(attrs.get("tool_parameters"), tool_name)
    if tp is not None:
        out_attrs["tool_parameters"] = tp

    res_attrs = (record.get("resource") or {}).get("attributes") or {}
    out_res_attrs = {k: v for k, v in res_attrs.items() if k in RES_ATTRS}

    return {
        "body": record.get("body"),
        "attributes": out_attrs,
        "resource": {"attributes": out_res_attrs},
    }


def _ensure_stream():
    try:
        logs.create_log_stream(logGroupName=LOG_GROUP, logStreamName=LOG_STREAM)
    except logs.exceptions.ResourceAlreadyExistsException:
        pass


def handler(event, _context):
    payload = json.loads(gzip.decompress(base64.b64decode(event["awslogs"]["data"])))

    events = []
    for raw in payload.get("logEvents", []):
        clean = _sanitize(raw.get("message", ""))
        if clean is None:
            continue
        events.append(
            {
                "timestamp": raw["timestamp"],
                "message": json.dumps(clean, ensure_ascii=False),
            }
        )

    if not events:
        return

    events.sort(key=lambda e: e["timestamp"])
    _ensure_stream()
    logs.put_log_events(
        logGroupName=LOG_GROUP,
        logStreamName=LOG_STREAM,
        logEvents=events,
    )
