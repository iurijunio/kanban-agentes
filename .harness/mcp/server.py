#!/usr/bin/env python3
"""Harness MCP server: memory, area lookup, focused tests, plan flag.

Standard library only. Newline-delimited JSON-RPC over stdio. Runs from the
project root, and every path below is relative to it.
"""
import datetime as dt
import fnmatch
import functools
import glob
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.getcwd()
HARNESS = os.path.join(ROOT, ".harness")
MEMORY = os.path.join(HARNESS, "memory")
STATE = os.path.join(HARNESS, "state")
LOG = os.path.join(HARNESS, "log")
TYPES = {"domain", "pitfall", "decision", "state", "lesson"}
AGE_LIMIT_DAYS = {"state": 14, "lesson": 30, "pitfall": 180, "decision": 180}
PLAN_FLAG = os.path.join(STATE, "plan-approved")
SEARCH_LIMIT = 15
SUMMARY_CHARS = 160


def today():
    return dt.date.today().isoformat()


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48] or "note"


def read_config():
    with open(os.path.join(HARNESS, "harness.json"), encoding="utf-8") as f:
        return json.load(f)


def read_areas():
    try:
        with open(os.path.join(MEMORY, "areas.json"), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def parse_note(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    meta, body = {}, text
    match = re.match(r"---\n(.*?)\n---\n?(.*)", text, re.S)
    if match:
        body = match.group(2)
        for line in match.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip()] = value.strip()
    return meta, body.strip()


def all_notes():
    notes = []
    for path in glob.glob(os.path.join(MEMORY, "**", "*.md"), recursive=True):
        if os.path.basename(path) == "INDEX.md":
            continue
        meta, body = parse_note(path)
        if meta.get("id"):
            notes.append((meta, body, path))
    return notes


def is_stale(meta):
    """A note is stale past its age limit or when its code changed after it."""
    updated = meta.get("updated", "")
    limit = AGE_LIMIT_DAYS.get(meta.get("type", ""))
    try:
        age = (dt.date.today() - dt.date.fromisoformat(updated)).days
    except ValueError:
        return True
    if limit is not None and age > limit:
        return True
    last = last_change(meta.get("area", ""))
    return bool(last) and last > updated


@functools.lru_cache(maxsize=None)
def last_change(area):
    """Date of the last commit in the code of an area; cached for the session."""
    paths = read_areas().get(area, {}).get("paths", [])
    if not paths:
        return ""
    try:
        return subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", *paths],
            capture_output=True, text=True, timeout=20, cwd=ROOT,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def summary(meta, body):
    first = body.splitlines()[0].replace("**", "")[:SUMMARY_CHARS] if body else ""
    mark = "⚠ stale " if is_stale(meta) else ""
    return f"{mark}{meta['id']} [{meta.get('type')}/{meta.get('area', '-')}] {first}"


def write_index():
    lines = ["# Memory index (generated, do not edit)", ""]
    for meta, body, _ in sorted(all_notes(), key=lambda n: n[0]["id"]):
        lines.append("- " + summary(meta, body))
    with open(os.path.join(MEMORY, "INDEX.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def write_note(kind, area, text, status=None, severity=None):
    if kind not in TYPES:
        raise ValueError(f"unknown note type: {kind}")
    if not area or not text.strip():
        raise ValueError("area and text are required")
    folder = {"domain": "domain", "decision": "decisions", "state": "state"}.get(kind)
    if folder is None:
        folder = os.path.join("pitfalls" if kind == "pitfall" else "lessons", slug(area))
    name = slug(area) if kind == "state" else f"{today()}-{slug(text)}"
    note_id = f"{kind}-{name}" if kind == "state" else name
    meta = {"id": note_id, "type": kind, "area": area, "updated": today()}
    if status:
        meta["status"] = status
    if severity:
        meta["severity"] = severity
    path = os.path.join(MEMORY, folder, f"{name}.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    head = "\n".join(f"{k}: {v}" for k, v in meta.items())
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"---\n{head}\n---\n{text.strip()}\n")
    write_index()
    return note_id


# --- tools ---------------------------------------------------------------

def memory_search(query="", area=None, type=None):
    if not query and not area and not type:
        raise ValueError("give a query, an area or a type")
    words = query.lower().split()
    hits = []
    for meta, body, _ in all_notes():
        if area and meta.get("area") != area:
            continue
        if type and meta.get("type") != type:
            continue
        haystack = (body + " " + meta["id"]).lower()
        score = sum(word in haystack for word in words)
        if score or not words:
            hits.append((score, summary(meta, body)))
    hits.sort(key=lambda h: -h[0])
    lines = [h[1] for h in hits[:SEARCH_LIMIT]]
    if len(hits) > SEARCH_LIMIT:
        lines.append(f"{len(hits) - SEARCH_LIMIT} more; narrow with a query")
    return "\n".join(lines) or "no notes found"


def memory_get(id):
    for meta, body, _ in all_notes():
        if meta["id"] == id:
            return f"{meta}\n\n{body}"
    return f"note not found: {id}"


def lesson_add(area, text):
    return "recorded " + write_note("lesson", area, text, status="new")


def note_update_state(area, text):
    return "recorded " + write_note("state", area, text)


def note_promote(type, area, text, severity=None):
    if type not in {"pitfall", "domain", "decision"}:
        raise ValueError("type must be pitfall, domain or decision")
    return "recorded " + write_note(type, area, text, severity=severity)


def area_of(path):
    norm = path.replace("\\", "/")
    for name, info in read_areas().items():
        if any(fnmatch.fnmatch(norm, pattern) for pattern in info.get("paths", [])):
            return json.dumps({"area": name, "critical": info.get("critical", False), "skill_file": skill_file(info.get("skill"))})
    return json.dumps({"area": None, "critical": False, "skill_file": None})


def skill_file(name):
    return f".harness/skills/{name}/SKILL.md" if name else None


def tests_for(path):
    norm = path.replace("\\", "/")
    stem = os.path.splitext(os.path.basename(norm))[0]
    if stem.startswith("test_"):
        return [norm]
    found = glob.glob(os.path.join(ROOT, "tests", "**", f"test_{stem}*.py"), recursive=True)
    return sorted(os.path.relpath(p, ROOT).replace("\\", "/") for p in found)


def run_tests_for(path):
    targets = tests_for(path)
    if not targets:
        return f"no test file found for {path}; choose one and call this tool with it"
    command = read_config().get("tests_command", ["python", "-m", "pytest", "-q"])
    try:
        run = subprocess.run(
            [*command, "--tb=short", *targets],
            capture_output=True, text=True, timeout=300, cwd=ROOT,
        )
    except subprocess.TimeoutExpired:
        return "tests timed out after 300 s: " + " ".join(targets)
    except OSError as err:
        return f"could not run tests: {err}"
    if run.returncode == 0:
        return "passed: " + (run.stdout.strip().splitlines() or ["ok"])[-1]
    return "failed:\n" + "\n".join((run.stdout + run.stderr).splitlines()[-60:])


def plan_approve():
    os.makedirs(STATE, exist_ok=True)
    with open(PLAN_FLAG, "w", encoding="utf-8") as f:
        f.write(today())
    return "plan approved"


def plan_clear():
    if os.path.exists(PLAN_FLAG):
        os.remove(PLAN_FLAG)
    return "plan cleared"


def text_input(required=(), **props):
    return {
        "type": "object",
        "properties": {name: {"type": "string", "description": desc} for name, desc in props.items()},
        "required": list(required),
    }


TOOLS = {
    "memory_search": (memory_search, "Search project memory; returns compact id + summary lines.", text_input(query="Words to find; omit to list an area", area="Limit to an area", type="domain, pitfall, decision, state or lesson")),
    "memory_get": (memory_get, "Read one memory note by id.", text_input(["id"], id="Note id")),
    "lesson_add": (lesson_add, "Record what went wrong or a correction from the user.", text_input(["area", "text"], area="Area name", text="First line is the summary")),
    "note_update_state": (note_update_state, "Replace the current state note of an area.", text_input(["area", "text"], area="Area name", text="Current state")),
    "note_promote": (note_promote, "Write durable knowledge after the user approved it.", text_input(["type", "area", "text"], type="pitfall, domain or decision", area="Area name", text="First line is the summary", severity="high, medium or low")),
    "area_of": (area_of, "Map a file path to its area, skill file and critical flag.", text_input(["path"], path="File path")),
    "run_tests_for": (run_tests_for, "Run the tests tied to a file; returns only failures.", text_input(["path"], path="Source or test file")),
    "plan_approve": (plan_approve, "Mark the current plan as approved by the user.", text_input()),
    "plan_clear": (plan_clear, "Clear the plan approval when the task ends.", text_input()),
}


def handle(message):
    method = message.get("method")
    if method == "initialize":
        version = message.get("params", {}).get("protocolVersion", "2025-06-18")
        return {"protocolVersion": version, "capabilities": {"tools": {}}, "serverInfo": {"name": "harness", "version": read_config().get("version", "0")}}
    if method == "ping":
        return {}
    if method == "tools/list":
        return {"tools": [{"name": name, "description": tool[1], "inputSchema": tool[2]} for name, tool in TOOLS.items()]}
    if method == "tools/call":
        name = message["params"]["name"]
        args = message["params"].get("arguments") or {}
        started = time.time()
        try:
            return {"content": [{"type": "text", "text": TOOLS[name][0](**args)}]}
        except Exception as err:  # a tool failure must reach the model, not kill the server
            log_error(name, err, time.time() - started)
            return {"content": [{"type": "text", "text": f"error: {err}"}], "isError": True}
    raise LookupError(method)


def log_error(name, err, elapsed):
    os.makedirs(LOG, exist_ok=True)
    with open(os.path.join(LOG, "signals.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps({"t": int(time.time() * 1000), "kind": "server_error", "tool": name, "error": str(err), "elapsed": round(elapsed, 3)}) + "\n")


def main():
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    for line in sys.stdin:
        if not line.strip():
            continue
        message = json.loads(line)
        if "id" not in message:
            continue  # notification
        try:
            reply = {"result": handle(message)}
        except LookupError as err:
            reply = {"error": {"code": -32601, "message": f"unknown method: {err}"}}
        sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": message["id"], **reply}) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
