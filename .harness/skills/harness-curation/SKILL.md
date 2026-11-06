---
name: harness-curation
description: Review lessons and signals and propose harness changes. Use only through /improve-harness.
---
## Steps
1. Read: `python .harness/scripts/signals_report.py`, `memory_search("lesson", type="lesson")`, stale notes in the index.
2. Check what already exists, so nothing is duplicated.
3. Keep only what recurred in 2+ sessions, or one critical case. Zero findings is a valid answer.
4. Each finding: evidence, failure it prevents, exact change, how to confirm it, and the layer, in this order: check or permission > script or tool > skill > pitfall note > line in AGENTS.md.
5. Also show: size of AGENTS.md (cap 250 lines) and pieces unused in 30 days, as removal candidates.
6. The user approves item by item. Project knowledge: `note_promote`. Harness pieces: write `.harness/proposals/<date>.md` for the user to bring to ai-harness; you never change the harness.
