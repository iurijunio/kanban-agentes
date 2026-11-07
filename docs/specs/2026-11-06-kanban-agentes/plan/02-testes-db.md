# Passo 02 — Testes de schema/persistência (test-first, rodam vermelho)

Agente: `tester` · Dependências: passo 01

## Objetivo
Especificar, antes do código, o comportamento do banco: inicialização idempotente, schema do PRD e persistência ao reabrir o arquivo.

## Arquivos (tester só edita `tests/*`; `vitest.config.ts` já vem do passo 01)
- `tests/db/schema.test.ts`
- `tests/helpers.ts` (helpers de teste:`db` temporário — arquivo permitido p/ tester: `tests/*`)

## Mudanças (conteúdo dos testes)
- Os testes importam a **factory `criarDb(caminho)`** de `src/db` (contrato já fixado na spec §3; nesta etapa o import falha — é o vermelho esperado).
- **Init idempotente**: `criarDb(caminhoTemp)` duas vezes seguidas no mesmo arquivo não lança erro; tabelas `cards` e `historico` existem (query `sqlite_master`); colunas/CONSTRAINT conforme spec §3.
- **Persistência**: `criarDb`, inserir card e movimento com a repository API, `fecharDb()`, **`criarDb` de novo** e verificar que card/histórico continuam com mesma coluna/ator.
- **FK cascade**: com `foreign_keys=ON`, excluir um card no banco remove suas linhas de `historico`.
- Cada teste cria arquivo SQLite em temp próprio via `criarDb` — **nenhum teste toca `data/kanban.db`**.

## Teste / prova
```
npx vitest run tests/db/schema.test.ts
```
- **Esperado nesta etapa: FALHAR** (não existe `src/db` ainda). Colar a saída — é a prova do vermelho test-first.

## Notas
- Executar via shell: `npx vitest run <arquivo>`; `run_tests_for` do harness não serve (só pytest). Colar saída no relatório.
- Não implementar código por conta própria; implementação é o passo 03.
