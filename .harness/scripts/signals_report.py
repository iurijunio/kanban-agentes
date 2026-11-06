#!/usr/bin/env python3
"""Group harness signals by signature for /improve-harness. Run from the project root.

A signal counts by distinct sessions, not occurrences. A loop is the same
signature three or more times in a row inside one session.
"""
import collections
import json
import os
import sys

PATH = os.path.join(".harness", "log", "signals.jsonl")
LOOP_STREAK = 3


def load():
    if not os.path.exists(PATH):
        return []
    rows = []
    with open(PATH, encoding="utf-8") as f:
        for line in f:
            try:
                rows.append(json.loads(line))
            except ValueError:
                continue
    return rows


def group(rows):
    """Return {signature: set of sessions}, adding loops found in the tool calls."""
    sessions = collections.defaultdict(set)
    last = {}
    for row in rows:
        kind, session = row.get("kind"), row.get("session", "?")
        if kind == "call":
            previous, streak = last.get(session, (None, 0))
            streak = streak + 1 if row.get("sig") == previous else 1
            last[session] = (row.get("sig"), streak)
            if streak >= LOOP_STREAK:
                sessions[f"loop:{row.get('tool')}:{row.get('sig')}"].add(session)
        else:
            sessions[f"{kind}:{row.get('tool') or row.get('action', '-')}"].add(session)
    return sessions


def main():
    grouped = group(load())
    if not grouped:
        print("no signals")
        return 0
    for signature, found in sorted(grouped.items(), key=lambda item: -len(item[1])):
        print(f"{len(found)} session(s)  {signature}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
