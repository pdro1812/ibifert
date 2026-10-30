## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Workflow /ship

Configuração específica deste repositório para o orquestrador global `/ship` (`~/.claude/skills/ship/SKILL.md`).

- Stack: backend Node/Express + TypeScript + Drizzle (Postgres) em `backend/`; frontend React + Vite + Tailwind em `frontend/`.
- Base: `main`. Branches: `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `test/…`. Commits convencionais em português, por exemplo `feat(ui): …`.
- **Push em `main` dispara o CI de build e push de imagens** (`.github/workflows/main.yml`). Nunca fazer push em `main`; usar apenas branch e PR.
- Migrações: gerar com `npm run db:generate` (em `backend/drizzle/`). Nunca rodar `db:migrate` ou `db:push` contra banco real.
- Verificação (rodar só o que a mudança tocar):
  - Backend: `cd backend && npm run build && npm test`
  - Frontend: `cd frontend && npm run lint && npm test && npm run build`
  - E2E (mudanças de UI/fluxo): `cd frontend && npm run test:e2e` (Playwright sobe o Vite na porta 4321)
- Revisores: `ecc:typescript-reviewer` (backend), `ecc:react-reviewer` (`.tsx`), `ecc:database-reviewer` (schema/migrações) e `ecc:security-reviewer` (auth/rotas/entrada).
- Áreas sensíveis: cálculos agronômicos (`backend/src/utils/calagem*`, calculadora completa) exigem testes cobrindo os valores esperados.
