---
name: spec-writing
description: Write PRD, spec, plan and change reports. Use on tasks sized impacto or novo. Do not use on micro or simples.
---
## Where
`docs/specs/<YYYY-MM-DD>-<topic>/`: `prd.md` (novo only), `spec.md`, `plan/NN-<step>.md`, `changes/NN.md`. Each file up to ~200 lines.

## Contents
- `prd.md`: goal, users, scope and out of scope, acceptance criteria.
- `spec.md`: what changes, reuse, risks, decisions and how to verify.
- `plan/`: small steps, each with files, the test that proves it and the agent.
- `changes/NN.md`: any change after approval, with before, after and why. The user must see it.

The user approves once (`/approve`). Questions during construction are welcome.
