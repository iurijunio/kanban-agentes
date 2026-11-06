#!/usr/bin/env python3
"""Hook logic of the harness: reads the event JSON on stdin, answers on stdout.

    hook.py session | pre | failure | denied | scope <pattern>...

A failure here never stops the session: the permission rules still hold.
"""
import fnmatch
import hashlib
import json
import os
import sys
import time

HARNESS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(HARNESS, "log")
PLAN_FLAG = os.path.join(HARNESS, "state", "plan-approved")
DEFAULT_READ_LIMIT = 300


def config():
    try:
        with open(os.path.join(HARNESS, "harness.json"), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def signal(**row):
    os.makedirs(LOG, exist_ok=True)
    with open(os.path.join(LOG, "signals.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps({"t": int(time.time() * 1000), **row}) + "\n")


def pre_tool_output(decision=None, reason=None, updated=None):
    out = {"hookEventName": "PreToolUse"}
    if decision:
        out["permissionDecision"] = decision
    if reason:
        out["permissionDecisionReason"] = reason
    if updated is not None:
        out["updatedInput"] = updated
    return {"hookSpecificOutput": out}


def on_session(event):
    os.makedirs(LOG, exist_ok=True)
    with open(os.path.join(LOG, "plugin-heartbeat.json"), "w", encoding="utf-8") as f:
        json.dump({"t": int(time.time() * 1000), "adapter": "claude-code", "version": None, "model": event.get("model")}, f)


def on_pre(event):
    tool = event.get("tool_name", "")
    data = event.get("tool_input") or {}
    sig = hashlib.sha1((tool + json.dumps(data, sort_keys=True)).encode("utf-8")).hexdigest()[:10]
    signal(kind="call", tool=tool, sig=sig, session=event.get("session_id"))
    conf = config()
    if tool == "Read" and data.get("limit") is None and data.get("offset") is None:
        return pre_tool_output(updated={**data, "limit": conf.get("read_limit_lines", DEFAULT_READ_LIMIT)})
    if tool == "Agent" and data.get("subagent_type") in conf.get("gated_agents", []) and not os.path.exists(PLAN_FLAG):
        return pre_tool_output("ask", f"{data.get('subagent_type')} runs outside an approved plan")
    return None


def on_scope(event, patterns):
    """Deny an edit outside the paths this agent may change."""
    path = (event.get("tool_input") or {}).get("file_path", "")
    root = event.get("cwd") or os.path.dirname(HARNESS)
    relative = os.path.relpath(path, root).replace("\\", "/") if path else ""
    if any(fnmatch.fnmatch(relative, pattern) for pattern in patterns):
        return None
    signal(kind="denied", tool=event.get("tool_name"), session=event.get("session_id"))
    return pre_tool_output("deny", f"This agent may only edit: {', '.join(patterns)}. Report what is needed instead.")


def main():
    try:
        mode = sys.argv[1]
        event = json.loads(sys.stdin.buffer.read().decode("utf-8") or "{}")
        answer = None
        if mode == "session":
            on_session(event)
        elif mode == "pre":
            answer = on_pre(event)
        elif mode == "scope":
            answer = on_scope(event, sys.argv[2:])
        elif mode == "failure":
            signal(kind="tool_error", tool=event.get("tool_name"), session=event.get("session_id"))
        elif mode == "denied":
            signal(kind="denied", tool=event.get("tool_name"), session=event.get("session_id"))
        if answer:
            sys.stdout.write(json.dumps(answer))
    except Exception:  # the harness never breaks the session
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
