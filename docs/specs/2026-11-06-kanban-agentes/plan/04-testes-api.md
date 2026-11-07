# Passo 04 — Testes da API (test-first)

Agente: `tester` · Dependências: passo 03

## Objetivo
Especificar o contrato HTTP da spec §4 (ator agente) antes das rotas existirem.

## Arquivos
- `tests/api/cards.test.ts`,
- `tests/api/mover.test.ts`
- helper `tests/api/utils.ts`: define `KANBAN_DB_PATH` p/ arquivo temporário e usa `criarDb`/`fecharDb` **antes de importar as rotas** (import dinâmico `await import("@/app/api/cards/route")` após preparar o valor) e reseta o singleton entre testes (`fecharDb()` e reabrir com novo temp no `beforeEach`). As rotas leem o banco via `getDb()` na primeira chamada, depois do env já estar posto. **Regra: nenhum teste toca o banco default `data/kanban.db`.**

## Mudanças (conteúdo dos testes)
Chamar os handlers diretamente: `import { GET, POST } from "@/app/api/cards/route"` e `@[id]/route.ts`, `@[id]/mover/route.ts`, com `Request`/`NextRequest` em memória e `params` como Promise (Next 16).

- **Auth / CA5**: GET/POST/PATCH/DELETE/POST-mover **sem** header → 200/201/204 (ator humano); com `Bearer token-errado` → **401** `{"erro":"nao_autenticado"}`; esse 401 não altera dados (conferir lista depois). Env não configurada + Bearer qualquer → 401.
- **Validação / CA6**: POST sem `titulo` → 400; POST coluna/tipo inválido → 400; mover p/ `column-fantasma` → **400** e nada altera.
- **404**: GET/PATCH/DELETE/POST-mover com id inexistente → 404 `{"erro":...}`.
- **CRUD / CA7, CA8, CA11**: Bearer válido: lista contém card criado; `GET /:id` retorna `{card, historico}`; POST cria com histórico `de=null, ator=agente`; PATCH edita; DELETE → 204 e card sai da lista.
- **Movimento / CA9**: POST `/mover` com Bearer válido → 200 card na nova coluna e histórico com `ator:"agente"`.
- Formato de erro sempre `{erro: string}`.

## Teste / prova
```
npx vitest run tests/api
```
- **Esperado nesta etapa: FALHAR** (rotas não existem). Colar a saída como prova do vermelho.
- `run_tests_for` não usa; só `npx vitest run <caminho>` pelo shell.
