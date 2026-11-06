---
name: graph-first
description: Locate code through the code graph before reading files. Use when you need to find where something is, what calls it or what a change affects.
---
## Steps
1. `python -m graphify query "<question>" --budget 1500`; also `explain "<symbol>"`, `path "<a>" "<b>"`, `affected "<symbol>"`.
2. Read only the returned range (`offset` + `limit`).
3. No graph, or no answer: use grep on a precise term, never read whole folders.
4. A query that led nowhere: `python -m graphify save-result --outcome dead_end`.
