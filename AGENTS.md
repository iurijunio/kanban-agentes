# Agent instructions (core)

Projeto existente: Kanban local single-user (UI humana em Next.js + API com token para agentes).
Spec e plano aprovados em `docs/specs/2026-11-06-kanban-agentes/`.

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

## Projeto Kanban
- Stack: Next.js 16 (App Router) + React 19 + TypeScript; SQLite embutido (`node:sqlite`), sem ORM.
- Entrypoints: `src/app/page.tsx` → `src/components/board.tsx` (`card.tsx`, `card-form.tsx`, `detalhe-card.tsx`); API em `src/app/api/cards/` (`route.ts`, `[id]/route.ts`, `[id]/mover/route.ts`); dados em `src/db/index.ts` e `src/db/cards.ts`; colunas em `src/lib/colunas.ts`; auth em `src/lib/auth.ts`.
- Comandos: `npm run dev`, `npm test`, `npx vitest run <arquivo>`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

### Gotchas
- `run_tests_for` do harness só acha pytest; rode testes pelo shell (`npx vitest run <arquivo>`) e cole a saída.
- `next dev` reescreve o bloco Next.js no fim deste arquivo; não remova.
- `node:sqlite` emite `ExperimentalWarning` no log; é esperado.
- `npm run lint` tem 1 warning pré-existente em `.opencode/plugins/harness.js`; não é erro.
- `.env.local` e `data/` são ignorados pelo git; não versione.
- PATCH não move coluna; use `POST /api/cards/:id/mover`.
- Exemplos de API no README usam `Invoke-RestMethod`; `curl.exe -d` com JSON escapado quebra no Windows PowerShell.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
