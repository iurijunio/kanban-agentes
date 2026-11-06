---
name: memory-use
description: Search project knowledge and record lessons. Use before deciding or editing an area, and after a mistake or a correction from the user.
---
## Steps
1. Before editing: `area_of(path)`, then `memory_search(query, area)`. Read details with `memory_get(id)`.
2. A note marked ⚠ stale may be wrong: check it against the code.
3. After a mistake or a user correction: `lesson_add(area, text)`. First line = the summary; say what happened and how to avoid it.
4. Never edit `.harness/memory` directly. Durable knowledge is written only after the user approves it.
