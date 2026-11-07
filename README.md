# Kanban de tasks (local)

Kanban local **single-user**: você move cards pela UI no navegador e um agente de IA
(OpenCode, script, etc.) usa a mesma API HTTP autenticando com token Bearer.
Next.js (App Router) + SQLite via `node:sqlite`, sem serviços externos.

## Requisitos

- Node 22 (o projeto usa o módulo embutido `node:sqlite`).

## Setup

```powershell
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cole a saída do último comando como `AGENT_API_TOKEN` no `.env.local`.
`KANBAN_DB_PATH` é opcional (default `data/kanban.db`).
`.env.local` **não é versionado**.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | UI + API em http://localhost:3000 |
| `npm test` | testes (`vitest run`) |
| `npx vitest run <arquivo>` | um arquivo de teste isolado |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | checagem de tipos |
| `npm run build` | build de produção |

> `run_tests_for` do harness não encontra os testes deste projeto (só pytest);
> rode pelo shell com `npx vitest run`.

## API

Base: `http://localhost:3000`.

### Ator

| Requisição | Ator |
|---|---|
| Sem header `Authorization` | `humano` (é assim que a UI chama) |
| `Authorization: Bearer <AGENT_API_TOKEN>` válido | `agente` |
| Header presente mas token vazio/errado, ou env não configurada | **401** `{"erro":"nao_autenticado"}` |

O ator fica registrado no histórico de cada movimento.

### Rotas

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/api/cards` | — | `200` lista de cards |
| POST | `/api/cards` | `{ "titulo", "tipo", "coluna", "descricao"? }` | `201` card criado |
| GET | `/api/cards/:id` | — | `200 { card, historico }` |
| PATCH | `/api/cards/:id` | `{ "titulo"?, "descricao"?, "tipo"? }` | `200` card atualizado |
| DELETE | `/api/cards/:id` | — | `204` sem corpo |
| POST | `/api/cards/:id/mover` | `{ "para" }` | `200` card na nova coluna |

Erros sempre em JSON `{"erro":"<mensagem>"}` com 400, 401 ou 404.

- `tipo`: `bug` | `feature`
- `titulo`: obrigatório, não vazio, até 200 caracteres
- `coluna` / `para`: `backlog`, `a_fazer`, `em_andamento`, `em_revisao`, `concluido`
- PATCH **não move** o card: mudança de coluna é só por `/mover`.

### Exemplos (PowerShell)

Use `Invoke-RestMethod` (nativo do PowerShell). No Windows PowerShell 5.1,
`curl.exe -d` com JSON escapado (`'{\"titulo\":...}'`) **não é confiável**: quebra em
`unmatched close brace` ou resulta em `400 corpo invalido`.

```powershell
$env:AGENT_API_TOKEN = "<token-gerado>"
$headers = @{ Authorization = "Bearer $env:AGENT_API_TOKEN" }

# criar
$novo = @{ titulo = "Corrigir login"; descricao = "Erro 500 no SSO"; tipo = "bug"; coluna = "backlog" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/cards -Headers $headers -ContentType "application/json" -Body $novo

# listar
Invoke-RestMethod -Uri http://localhost:3000/api/cards -Headers $headers

# detalhe (card + histórico)
Invoke-RestMethod -Uri "http://localhost:3000/api/cards/<id>" -Headers $headers

# mover
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/cards/<id>/mover" -Headers $headers -ContentType "application/json" -Body (@{ para = "em_andamento" } | ConvertTo-Json)

# editar (PATCH não move)
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/cards/<id>" -Headers $headers -ContentType "application/json" -Body (@{ titulo = "Corrigir login (SSO)"; tipo = "feature" } | ConvertTo-Json)

# excluir (204 sem corpo: sem saída)
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/api/cards/<id>" -Headers $headers
```

Em bash/Linux, `curl` funciona normalmente (ex.: `-H "Authorization: Bearer $TOKEN"`
e `--data-binary @arquivo.json` para corpos JSON). No PowerShell, prefira
`Invoke-RestMethod` ou `--data-binary @arquivo.json`.

## Persistência

Tudo fica em `data/kanban.db` (ignorado pelo git). Apagar esse arquivo reseta o board.

## Limitações

- Single-user e local: nenhuma noção de usuários ou permissões.
- Sem realtime: a UI atualiza ao carregar e pelo botão **Atualizar** (ou após uma ação sua).
- Colunas fixas: as cinco acima; não há criação/remoção de colunas.
- O agente tem poder total: as mesmas rotas e regras do humano, incluindo excluir.
- PATCH não move; para mudar de coluna use `POST /api/cards/:id/mover`.
- Mover para a mesma coluna é aceito pela API (gera histórico); na UI o drop na
  mesma coluna é ignorado.

Spec e plano: `docs/specs/2026-11-06-kanban-agentes/`.
