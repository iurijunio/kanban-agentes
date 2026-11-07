# Passo 05 — Rotas da API

Agente: `implementer` · Dependências: passo 04 (vermelho)

## Objetivo
Fazer `tests/api` passar: as 6 rotas com auth, validação e formato de erro da spec §4.

## Arquivos
- `src/lib/auth.ts` — `resolverAtor(request)`: sem header → `{ator:"humano"}`; `Bearer` válido vs `AGENT_API_TOKEN` → `{ator:"agente"}`; qualquer outro header/estado → `{status:401, erro:"nao_autenticado"}`.
- `src/app/api/cards/route.ts` — `GET` (lista), `POST` (cria; 201).
- `src/app/api/cards/[id]/route.ts` — `GET` (card + histórico), `PATCH` (edita), `DELETE` (exclui; 204).
- `src/app/api/cards/[id]/mover/route.ts` — `POST` (mover).

## Mudanças
- Cada handler chama `resolverAtor` **antes de tocar o banco** (401 nada altera), valida payload (erros `{erro}` com 400), usa o repositório do passo 03 e mapeia `erro.status` → resposta.
- `params` em Next 16 é Promise: `const {id} = await params`. Handler assinado para caber no teste (mesma assinatura).
- DELETE devolve `new Response(null, {status:204})` (corpo vazio). Nenhum try/catch genérico engulindo 400/404.

## Teste / prova
```
npx vitest run tests/api         # verde (colar saída)
npx vitest run                   # TODA a suíte verde (db+api)
npx tsc --noEmit && npm run lint
```
Prova manual rápida (dev server): curl com/sem Bearer confirmando 201/401/400/404 (colar resultados no relatório).

## Notas
- Nenhuma dependência nova: `fetch`/`NextResponse` padrão.
