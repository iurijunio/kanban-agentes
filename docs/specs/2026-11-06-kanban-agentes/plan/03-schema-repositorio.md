# Passo 03 — Schema + repositório em node:sqlite

Agente: `implementer` · Dependências: passo 02 (vermelho)

## Objetivo
Fazer o passo 02 passar: abrir o banco, garantir schema idempotente e expor repositório com CRUD, mover e histórico sob regras únicas.

## Arquivos
- `src/lib/colunas.ts` — `COLUNAS = ["backlog","a_fazer","em_andamento","em_revisao","concluido"] as const`, `ROTULOS` p/ UI, `ehColuna(x)`, `tipo` (`bug|feature` e `ehTipo`).
- `src/db/index.ts` — singleton lazy `getDb()` p/ as rotas **e** exportação obrigatória de `criarDb(caminho)`/`fecharDb()`: abrem/fecham uma DatabaseSync independente em `caminho` (mesmo init idempotente e `PRAGMA foreign_keys = ON`), para os testes nunca abrirem `data/kanban.db`. `KANBAN_DB_PATH` (default `data/kanban.db`), `mkdir` do diretório, `CREATE TABLE IF NOT EXISTS` (spec §3).
- `src/db/cards.ts` — funções: `listarCards`, `obterCard(id)`, `criarCard(dados, {ator})`, `editarCard(id, dados)`, `excluirCard(id)`, `moverCard(id, para, {ator})`, `historicoDeCard(id)`. Validação única `validar(dados, contexto)` (+obs.: PATCH não altera coluna; mover não muda título). Retornam erro tipado (`{erro, status}`) — não lançam excesso genérico.

## Mudanças
- Implementar conforme spec §§3, 5; transação única em `moverCard` e `criarCard` (`db.exec("BEGIN")`/`COMMIT`/`ROLLBACK`); `id` = `crypto.randomUUID()`; timestamps ISO UTC.

## Teste / prova
```
npx vitest run tests/db/schema.test.ts   # passo 02 fica verde
npx vitest run tests/db/repositorio.test.ts   # novo lote, também verde:
```
- Casos (`tests/db/repositorio.test.ts`): criar card válido (id, timestamps ISO, colunas corretas, histórico `de=null` + ator informado); criar com titulo vazio → erro 400; criar com coluna/tipo inválido → erro 400; editar título/tipo/descrição (atualizado_em muda, sem histórico novo); mover para cada coluna e até mesma coluna → histórico registra `de`, `para`, ator; coluna inválida no mover → erro 400 **e nada muda** (conferir card e histórico intactos); persistência/reabertura via `criarDb`/`fecharDb` (do passo 02 segue passando). Todos com `criarDb(temp)` — nunca `data/kanban.db`.
- `npx tsc --noEmit` limpo.

## Notas
- Sem ORM/axios; só `node:sqlite`, `crypto`. Colar saídas dos vitest no relatório.
