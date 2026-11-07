---
id: 2026-11-06-react-19-next-16-lint-bloqueia-setstate-s-ncrono
type: lesson
area: frontend
updated: 2026-11-06
status: new
---
React 19/Next 16 lint bloqueia setState síncrono em useEffect (react-hooks/set-state-in-effect)
Chamar uma função assíncrona que seta estado logo no início do effect é reportado como erro. Solução: buscar dados em função pura e aplicar setState apenas dentro de .then() do effect; o refresh manual pode setar estado no handler.
