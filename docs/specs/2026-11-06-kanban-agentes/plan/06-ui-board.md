# Passo 06 — UI do board

Agente: `implementer` · Dependências: passo 05

## Objetivo
Board Kanban funcional no navegador: 5 colunas, CRUD, mover por drag e por botões, histórico visível, atua sem token (ator humano).

## Arquivos
- `src/app/page.tsx` — renderiza `<Board/>` (client flow) com metadata/título do app.
- `src/components/board.tsx` — 5 colunas fixas (from `src/lib/colunas.ts`), estado `useState`, carrega via `GET /api/cards` no mount, botão "Atualizar", exibição de mensagens de erro inline.
- `src/components/card.tsx` — card draggable, botões ← / →, abrir detalhe (histórico `GET /api/cards/:id`), editar e excluir (`window.confirm`).
- `src/components/card-form.tsx` — criar (titulo, tipo, coluna inicial, descrição) e editar (sem coluna); título obrigatório validado antes do fetch.
- `src/app/globals.css` (ajustes mínimos; Tailwind v4 já configurada).

## Mudanças
- Movimento: HTML5 drag nativo (`draggable`, `onDragStart` no card, `onDragOver`/`onDrop` na coluna → `POST /:id/mover`); além disso, **botões ← / →** em cada card (movem para coluna anterior/seguinte) — acessível sem mouse.
- Toda chamada via `fetch` **sem** header de autorização. Após cada mutação, re-fetch da lista (e do detalhe aberto, se houver).
- Erros 400 da API aparecem próximos ao formulário/botão. Sem realtime: botão "Atualizar" recarrega o estado (limitação R3 documentada).

## Teste / prova
```
npx vitest run              # suíte continua verde (UI não quebra API)
npx tsc --noEmit && npm run lint
npm run dev → abrir http://localhost:3000 e executar manualmente (CA1, CA2, CA4):
```
Checklist manual a colar no relatório: (a) 5 colunas visíveis; (b) criar card (titulo obrigatório rejeita vazio); (c) editar; (d) excluir com confirm; (e) mover arrastando entre colunas; (f) mover pelos botões; (g) histórico do card lista movimentos com ator=humano e data/hora.
