# Agent instructions (core)

New project, no code yet. The user's request defines what it is.

## Always
- Answer the user in Portuguese (pt-BR), direct, following the answer contract.
- Start every answer with the task size: `Tamanho: micro|simples|impacto|novo — <why>`.
- If anything is ambiguous, ask before starting (skill `clarify`). Never guess.
- Search memory before deciding or editing (`memory_search`); record what went wrong (`lesson_add`).
- Smallest change that solves the task; nothing speculative.

## Never
- Commit, push, or `git add -A` / `git add .`; only the user commits; stage by path.
- Claim something works without having run it.

## Workflow by size
| Size | Produces | Verification |
|---|---|---|
| micro | nothing | tests |
| simples | plan of up to 3 lines in the answer | `verifier` (`check-delivery`) |
| impacto | `docs/specs/<date>-<topic>/spec.md` + `plan/`, approved once | all checklists + `reviewer` |
| novo | `prd.md` first, then as impacto | same |

## Where things live
- Knowledge: `.harness/memory/`, through tools only.
- Specs and plans: `docs/specs/`.
- Procedures: `.harness/skills/`.
