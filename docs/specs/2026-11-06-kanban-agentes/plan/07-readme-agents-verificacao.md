# Passo 07 — README, AGENTS.md e verificação final

Agente: `implementer` · Dependências: passo 06

## Objetivo
Documentação executável (setup, token, curl do agente) e verificação resumida dos critérios de aceitação.

## Arquivos
- `README.md`
- `AGENTS.md` (editar, preservando instruções existentes; apenas acrescentar seção do projeto)

## Mudanças
**README.md** contém:
1. Setup: Node 22, `npm install`, `Copy-Item .env.example .env.local` e **gerar token forte** com Node (não assumir openssl):
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Colar a saída como `AGENT_API_TOKEN` no `.env.local`; não versionar `.env.local` (risco R1).
2. Comandos reais: `npm run dev`, `npm test` (= `vitest run`), `npm run lint`, `npx tsc --noEmit`.
3. **Ressalva**: o run_tests_for do harness não serve aqui (só acha pytest); testes rodam por `npx vitest run <arquivo>` colando a saída.
4. Exemplos para o agente em **Windows/PowerShell**, com `curl.exe` (evita o alias do PowerShell) e `$env:AGENT_API_TOKEN`:
   ```powershell
   $env:AGENT_API_TOKEN = "<token-gerado>"
   # listar
   curl.exe -H "Authorization: Bearer $env:AGENT_API_TOKEN" http://localhost:3000/api/cards
   # detalhe
   curl.exe -H "Authorization: Bearer $env:AGENT_API_TOKEN" http://localhost:3000/api/cards/<id>
   # criar (aspas escapadas p/ virar JSON no curl.exe no PowerShell)
   curl.exe -H "Authorization: Bearer $env:AGENT_API_TOKEN" -H "Content-Type: application/json" -d '{\"titulo\":\"exemplo\",\"tipo\":\"feature\",\"coluna\":\"backlog\"}' http://localhost:3000/api/cards
   # mover
   curl.exe -H "Authorization: Bearer $env:AGENT_API_TOKEN" -H "Content-Type: application/json" -d '{\"para\":\"em_andamento\"}' http://localhost:3000/api/cards/<id>/mover
   ```
   mais editar (PATCH), excluir (DELETE) e exemplos de resposta `{"erro":"..."}` com 400/401/404.
5. Limitações: single-user, sem realtime (R3), colunas fixas, agente tem poder total (R2).

**AGENTS.md**: acrescentar seção "Projeto kanban — comandos e citáveis" com os comandos acima + ressalva do run_tests_for + localização do spec/plan em `docs/specs/2026-11-06-kanban-agentes/`.

## Teste / prova
Rodar os dois curls principais contra o dev server e colar saídas. Verificação final dos CAs (marcando manual ✓):
- CA1–CA4, CA10: checklist manual do passo 06/07. CA10 = mover via curl, recarregar página e conferir.
- CA5–CA9, CA11: `npx vitest run` verde (colar saída completa).

## Notas
- Não commitar (somente o usuário). Se algo do checklist falhar, criar `plan/08-acertos.md` antes de fechar.
