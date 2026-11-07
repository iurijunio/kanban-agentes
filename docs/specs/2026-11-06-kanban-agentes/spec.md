# Spec — Kanban de Tasks com Agentes de IA

Data: 2026-11-06 · Tamanho: novo · Base: prd.md (mesma pasta, aprovado)

## 1. Arquitetura e fluxo

Single app Next.js (App Router), frontend e API no mesmo processo.

```
Navegador (React client)  ──fetch──>  Route Handlers (/api/cards*)  ──> cards.ts (repositório)  ──> node:sqlite (arquivo local)
Agente externo (OpenCode) ──HTTP+token (Bearer) ─┘ (mesma API, mesmas regras)
```

- A UI chama `fetch` sem header de autorização → ator `humano`.
- O agente chama a API com `Authorization: Bearer <AGENT_API_TOKEN>` → ator `agente`. Token presente e inválido → 401.
- Mudança de coluna = escrita de card + inserção no histórico, na **mesma transação SQLite**.
- Persistência: arquivo `data/kanban.db`, criado na primeira inicialização, sobrevive a reinício.

## 2. Layout de arquivos e entrypoints

```
src/lib/colunas.ts            constantes: ids de coluna + rótulos (fonte única p/ UI e API)
src/db/index.ts               abre DatabaseSync (KANBAN_DB_PATH, default data/kanban.db), init idempotente; singleton getDb() + factory criarDb(caminho)/fecharDb() p/ testes
src/db/cards.ts               repositório: CRUD, mover (com histórico), listar histórico
src/lib/auth.ts               resolveAtor(request): "agente" | "humano" | erro 401
src/app/api/cards/route.ts            GET lista, POST cria
src/app/api/cards/[id]/route.ts       GET detalhe (+histórico), PATCH edita, DELETE exclui
src/app/api/cards/[id]/mover/route.ts POST move
src/app/page.tsx              board (client component) — entrypoint da UI
src/components/board.tsx      colunas, drag nativo, botões de mover
src/components/card-form.tsx  criar/editar card
tests/helpers.ts              helpers de teste (db em arquivo temporário, nunca data/kanban.db)
tests/db/*.test.ts            schema, repositório, persistência
tests/api/*.test.ts           handlers com Request/Response em memória
vitest.config.ts              environment node, alias @ -> ./src, include tests/**/*.test.ts
data/                         *.db (não versionado)
```

Entrypoints: `npm run dev` (UI + API), `npm run test` (script `"test": "vitest run"`; arquivo isolado: `npx vitest run <arquivo>`), `npm run lint`, `npx tsc --noEmit`.

## 3. Schema SQL e inicialização idempotente

```sql
CREATE TABLE IF NOT EXISTS cards (
  id            TEXT PRIMARY KEY,                 -- crypto.randomUUID()
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  tipo          TEXT NOT NULL CHECK (tipo IN ('bug','feature')),
  coluna        TEXT NOT NULL CHECK (coluna IN ('backlog','a_fazer','em_andamento','em_revisao','concluido')),
  criado_em     TEXT NOT NULL,                    -- ISO 8601 (UTC)
  atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS historico (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id   TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  de        TEXT,                                 -- nulo na criação
  para      TEXT NOT NULL CHECK (para IN ('backlog','a_fazer','em_andamento','em_revisao','concluido')),
  ator      TEXT NOT NULL CHECK (ator IN ('humano','agente')),
  data_hora TEXT NOT NULL
);
```

- `db/index.ts` roda os `CREATE TABLE IF NOT EXISTS` a cada abertura — init idempotente, sem ferramenta de migração (R4).
- Exporta `getDb()` (singleton p/ as rotas) **e** `criarDb(caminho)`/`fecharDb()` (p/ os testes usarem arquivo temporário — nenhum teste abre `data/kanban.db`).
- Habilita `PRAGMA foreign_keys = ON` por conexão (necessário p/ o CASCADE).
- KANBAN_DB_PATH configurável p/ testes usarem arquivo temporário; default `data/kanban.db` (`mkdir` se faltar).

**Colunas como slugs ASCII** (`a_fazer`, `em_andamento`, `em_revisao`) na API/DB; `colunas.ts` mantém o rótulo exibido na UI ("A fazer", "Em andamento", "Em revisão").

## 4. Contrato da API

### Identificação do ator (todas as rotas)
| Situação | Resultado |
|---|---|
| Sem header `Authorization` | ator `humano` (é assim que a UI chama) |
| `Authorization: Bearer <token>` e token == `process.env.AGENT_API_TOKEN` | ator `agente` |
| Header presente, token ausente/vazio/errado, ou env não configurada | **401** `{"erro":"nao_autenticado"}` — nada é alterado |

### Rotas
| Método | Rota | Payload | 200/201 | Erros |
|---|---|---|---|---|
| GET | `/api/cards` | — | `200` lista ordenada por coluna (ordem fixa) e `criado_em` | — |
| POST | `/api/cards` | `{titulo, tipo, coluna, descricao?}` | `201` card criado (registra histórico `de=null, ator`) | 400 campo inválido/faltante |
| GET | `/api/cards/:id` | — | `200 {card, historico}` | 404 |
| PATCH | `/api/cards/:id` | `{titulo?, descricao?, tipo?}` | `200` card atualizado | 400, 404 |
| DELETE | `/api/cards/:id` | — | `204` | 404 |
| POST | `/api/cards/:id/mover` | `{para}` | `200` card na nova coluna | 400, 404 |

Erro sempre: JSON `{"erro": "<mensagem>"}` com 400/401/404. DELETE retorna corpo vazio (204). Os **6 métodos exigem os mesmos campos** em UI e API (D5); a UI não tem endpoint dedicado.

## 5. Regras de validação e de movimento/histórico

Regras (função única em `cards.ts`, usada por todas as rotas):
- `titulo`: string não vazia (trim > 0) e ≤ 200 chars; obrigatória em POST e PATCH (PATCH não pode deixá-la vazia).
- `tipo`: `bug` | `feature`. `coluna`/`para`: um dos 5 slugs. `descricao`: string opcional.
- POST cria com `criado_em = atualizado_em` e insere histórico (`de = null`, `para` = coluna inicial, ator do request).
- PATCH **não muda coluna** (coluna muda só via `/mover` — evita ambiguidade de histórico); atualiza `atualizado_em`, sem histórico.
- `/mover`: qualquer destino entre as 5 colunas é válido (inclusive reabrir; mover para a mesma coluna é permitido e registra histórico). Uma transação: `UPDATE cards SET coluna, atualizado_em` + `INSERT INTO historico (de, para, ator, data_hora)`; falha de validação/coluna inválida aborta **antes** de tocar o banco (criter. 6: nada altera).
- DELETE: `ON DELETE CASCADE` remove o histórico junto (decisão; ver §7).

## 6. UI

- `/` renderiza o board: 5 colunas fixas com títulos exibidos, cards como `draggable` nativo (HTML5 `dragstart`/`dragover`/`drop` — sem dnd-kit).
- Acessibilidade: movimento sem mouse **apenas** pelos botões `←`/`→` em cada card (coluna anterior/seguinte) e pelo drag nativo.
- Criar: botão "+" na coluna abre formulário (titulo obrigatório, tipo, **select de coluna inicial**). Editar: o mesmo formulário, **sem select de coluna** — PATCH não move (cf. §5); mudança de coluna só ocorre pela UI via drag/botões `←`/`→` → `POST /mover`. Excluir: botão com `confirm()` nativo.
- Histórico: abrir/detalhar um card (clique ou após ação) faz `GET /api/cards/:id` e lista movimentos (`de → para, ator, data_hora`).
- Estado: client component com `useState` do board; `fetch` em `useEffect` no mount + botão "Atualizar" (sem realtime, R3). Erros da API aparecem como mensagem inline.
- A UI nunca envia token; todas as chamadas dela valem como `humano`.

## 7. Decisões (com trade-offs) e riscos

- **node:sqlite (DatabaseSync)**: zero dependência nativa; trade-off: API experimental (ExperimentalWarning no log, aceitável) e sincrônico (ok: local, single-user). Alternativa better-sqlite3 descartada por Fato verificado.
- **Sem ORM**: SQL cru com função única de validação; trade-off: menos proteção tipada, mas schema de 2 tabelas simples.
- **Sem dnd-kit**: HTML5 drag nativo; trade-off: menos rico que dragging/toque, mitigado pelos botões acessíveis.
- **Histórico com CASCADE no DELETE**: simples; trade-off: perde trilha se o card for recriado — fora de escopo.
- **Patch não move coluna**: separa edição de movimento; trade-off: 2 chamadas para os agentes em vez de 1 genérica, mas contrato mais claro.
- **Auth tudo-com-token**: todas as rotas (até GET) autenticam o ator; trade-off: UI precisa não enviar header (garantido) — se alguém configurar um proxy que injete Bearer inválido na UI, veria 401 (cenário improvável, local).
- Riscos herdados do PRD (R1–R4): token em `.env.local` (não versionado), agente com mesmo poder, sem realtime, schema inicial fixo.

## 8. Verificação dos critérios de aceitação

`run_tests_for` do harness **não funciona** (só acha pytest); todos os testes rodam via `npx vitest run <arquivo>` no shell, colando a saída.

| CA | Como verificar | Tipo |
|---|---|---|
| 1 Board abre com 5 colunas | `npm run dev` + abrir localhost no navegador | Manual |
| 2 CRUD pela UI | Criar, editar, excluir no navegador e ver refletido | Manual |
| 3 Persiste após reinício | teste db (`npx vitest run tests/db`) reabrindo o arquivo + reinicar `npm run dev` e conferir | Autom. + manual |
| 4 Movimento UI registra ator/histórico | teste db (ator humano) + ver histórico no card na UI | Autom. + manual |
| 5 Token inválido = 401 | teste api (`npx vitest run tests/api`) | Automatizado |
| 6 Coluna inválida = 400 | teste api + teste db | Automatizado |
| 7 Agente lista/lê | teste api (Bearer válido em GETs) + curl pós-passos (README) | Autom. + manual |
| 8 Agente CRUD completo | teste api (Bearer válido em POST/PATCH/POST mover/DELETE) | Automatizado |
| 9 Movimento API registra `ator=agente` | teste db/api | Automatizado |
| 10 UI reflete o agente | Mover via curl, recarregar página no navegador | Manual |
| 11 Exclusão UI/API | teste api + verificar lista/board após excluir | Autom. + manual |
