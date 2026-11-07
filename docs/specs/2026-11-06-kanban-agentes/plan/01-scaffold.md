# Passo 01 — Scaffold Next e limpeza do template

Agente: `implementer` · Dependências: nenhuma (projeto vazio)

## Objetivo
App Next 16 + TS + Tailwind + App Router instalável e executável, sem lixo de template, com env preparada para o token do agente.

## Arquivos
- Na raiz do repo (do template): `src/` (app/layout/page/globals.css), `.gitignore`, `README.md`, `eslint.config.mjs`, `next-env.d.ts`, `next.config.ts`, `package.json`, `tsconfig.json`
- Criados pelo implementer: `vitest.config.ts`, `.env.example`
- NÃO tocar em: `AGENTS.md`, `docs/`, `.opencode/`, `.harness/`, `.git/`

## Mudanças
1. **Gerar em diretório temporário FORA do repo** (verificado: `create-next-app` na raiz falha com "The directory contains files that could conflict: AGENTS.md" e sai com código 1), p.ex.:
   ```powershell
   Remove-Item -Recurse -Force "$env:TEMP\kanban-scaffold" -ErrorAction SilentlyContinue
   npx create-next-app@latest "$env:TEMP\kanban-scaffold" --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm --empty --skip-install --disable-git --no-agents-md
   ```
2. **Copiar para a raiz apenas os itens gerados**, com `Copy-Item -Recurse`: `src/`, `.gitignore`, `README.md`, `eslint.config.mjs`, `next-env.d.ts`, `next.config.ts`, `package.json`, `tsconfig.json`. Nenhum outro arquivo/diretório entra no repo (em particular nada sobrescreve `AGENTS.md`).
3. `npm install` na raiz.
4. Ajustar `page.tsx` (template `--empty` já entrega mínimo): título/rótulo "Kanban" e nada mais.
5. `npm i -D vitest @types/node@^22` — `@types/node@^22` é obrigatório: os tipos de `node:sqlite` só existem a partir do 22 (verificado `sqlite.d.ts` na 22.20.5).
6. Criar `vitest.config.ts`: environment `node`, alias `@` → `./src`, include `tests/**/*.test.ts`.
7. `package.json`: adicionar script `"test": "vitest run"`.
8. `.gitignore`: garantir `data/` (arquivos `*.db`), `.env*.local`, `node_modules/`, `.next/`.
9. Criar `.env.example` com:
   ```
   KANBAN_DB_PATH=data/kanban.db
   AGENT_API_TOKEN=troque-por-token-forte
   ```

## Teste / prova
```
npm run build             # prova de compilação (mais confiável que dev pendurado)
npx tsc --noEmit          # sem erros
npx vitest run --passWithNoTests   # runner funcional, não há tests/ ainda (colar saída)
git check-ignore -v data/kanban.db .env.local   # prova os padrões de ignore sem precisar dos arquivos
```
- Opcional: `npm run dev` em background só para conferir http://localhost:3000: `$dev = Start-Process npm run dev -PassThru` captura o PID; encerrar depois apenas esse processo: `Stop-Process -Id $dev.Id`. NUNCA `Stop-Process -Name node` (mataria o próprio agente/harness).
- `run_tests_for` NÃO usar (só acha pytest); usar `npx vitest` via shell e colar saída.

## Critério de done
Build passa, página sem erro de build, vitest configurado (alias + node env), env exemplo presente, artefatos locais ignorados, arquivos do repo preservados.
