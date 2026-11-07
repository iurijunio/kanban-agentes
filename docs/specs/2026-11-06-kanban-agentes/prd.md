# PRD — Kanban de Tasks com Agentes de IA

Data: 2026-11-06 · Status: aguardando aprovação · Tamanho: novo

## 1. Objetivo e problema

Gerenciar tasks (bugs e novas features) localmente, com um board Kanban web onde tanto o usuário humano quanto um agente de IA externo podem criar, editar e mover cards com o mesmo poder. Hoje não existe um local único e rastreável para essas tasks: falta registro de quem fez cada mudança (humano ou agente) e histórico de movimentação.

## 2. Usuários

- **Usuário humano**: pessoa única, usa o board no navegador, local, sem login.
- **Agente de IA**: externo ao app (o próprio OpenCode), autentica via API HTTP com token, lê cards e cria/edita/move cards como o humano.

## 3. Escopo do MVP

- Board Kanban com colunas fixas: Backlog → A fazer → Em andamento → Em revisão → Concluído.
- Cards de task com criação, edição e exclusão pela UI.
- Movimento de cards na UI (drag/click entre colunas) e via API HTTP.
- API HTTP autenticada por token, para o agente: listar cards, ler card, criar, editar, mover, excluir.
- Histórico de movimentação por card: coluna de origem, coluna de destino, ator (humano/agente), data/hora.

## 4. Fora de escopo (explícito)

- Multi-usuário, login, permissões.
- LLM dentro do app (o agente é externo).
- Comentários em cards.
- Anexos.
- Notificações.
- Colunas customizáveis (fixas no MVP).
- Deploy (uso local apenas).
- Colaboração em tempo real.

## 5. Modelo funcional mínimo

### Card

- `id`: identificador único.
- `titulo`: texto obrigatório.
- `descricao`: texto opcional.
- `tipo`: `bug` ou `feature`.
- `coluna`: uma das cinco colunas fixas.
- `criado_em`, `atualizado_em`: data/hora.

### Operações (UI e API, mesmas regras)

- Criar card (titulo obrigatório; tipo e coluna iniciais informados).
- Editar card (titulo, descricao, tipo).
- Excluir card.
- Mover card de coluna para coluna (inclusive reabrir de Concluído; qualquer destino entre as colunas fixas é válido).

### Histórico de movimentação

Para cada movimento CRUD interpretado como mudança de coluna, registra-se:

- `card_id`, `de` (coluna anterior; criação = nula), `para` (coluna nova), `ator` (`humano` ou `agente`), `data_hora`.

## 6. Stack e dados

- Next.js + TypeScript, frontend e API no mesmo app.
- SQLite local (arquivo no projeto), persistência entre reinícios do app.

## 7. Critérios de aceitação (testáveis)

1. **Subir local**: com `npm run dev` (ou equivalente definido no spec), o board abre no navegador em localhost e mostra as 5 colunas.
2. **Criar/editar/excluir pela UI**: criar um card com titulo, editá-lo e excluí-lo reflete no board.
3. **Persistir após reinício**: criar cards e movê-los, reiniciar o servidor, e os cards e suas colunas permanecem.
4. **Movimento pela UI registra ator e histórico**: mover um card pela UI cria um registro de histórico com `de`, `para`, `ator=humano` e `data_hora`.
5. **Token inválido = 401**: requisição à API sem token ou com token inválido retorna HTTP 401 e não altera dados.
6. **Status inválido = 400**: mover um card para um valor de coluna que não existe retorna HTTP 400 e não altera dados.
7. **Agente lista e lê**: com token válido, o agente lista cards e lê um card específico via API.
8. **Agente cria/edita/move**: com token válido, o agente cria, edita, move e exclui um card via API.
9. **Movimento pela API registra ator e histórico**: movimento feito via API cria histórico com `ator=agente`.
10. **UI reflete o agente**: após o agente mover um card via API, a UI (recarregada) mostra o card na nova coluna.
11. **Exclusão**: excluir card (UI ou API) remove o card do board e da listagem da API.

## 8. Decisões

- **D1 — Agente externo via API HTTP com token**: o app não embute LLM; o OpenCode consome a mesma API, com o mesmo poder do humano. Simple e alinhado ao produto.
- **D2 — Atores: apenas `humano` e `agente`**: token de agente identifica o ator; requisição sem token pela UI é `humano`.
- **D3 — Colunas fixas no código**: nenhuma tabela/entidade de colunas customizáveis no MVP.
- **D4 — SQLite local**: arquivo no projeto, sem servidor de banco, persiste entre reinícios.
- **D5 — Mesmas regras de validação na UI e na API**: colunas e campos válidos são os mesmos para ambos os atores.

## 9. Riscos

- **R1 — Segurança do token local (médio)**: token em arquivo/env local pode vazar se compartilhado; mitigar com instrução de não versionar e de gerar token forte.
- **R2 — Agente com o mesmo poder do humano (médio)**: sem permissões, o agente pode excluir cards; aceito por decisão do produto, mas o histórico registra o ator.
- **R3 — Concordância de mutação pela UI (baixo)**: dois atores movendo o mesmo card podem ter conflito; fora de escopo (sem realtime), documentar como limitação conhecida.
- **R4 — Versionamento do SQLite (baixo)**: mudanças de schema no futuro precisam de migração; MVP assume schema inicial simples.
