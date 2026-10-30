# Análise de arquitetura e proposta de melhorias — IbIFerti

> Gerado em 2026-10-21. Documento de diagnóstico + roadmap; nada foi implementado.

## Contexto
Pedido: analisar a arquitetura e propor melhorias **sem modificar arquivos do projeto**. Este documento é só diagnóstico + roadmap; nada será implementado sem aprovação item a item.

Base da análise: grafo do graphify (1.229 nós, 74 comunidades) + leitura de `server.ts`, `analisesRoutes.ts`, `package.json`, CI, schema/migrations e contagem de linhas. Itens marcados **(não verificado)** vêm só da documentação em `docs/`.

## Arquitetura atual (resumo)
React 19 + Vite + Tailwind (SPA) → axios (`/api`) → Express 5 + Zod → motores puros (`services/motorCalagem`, `motorAdubacao`) → Drizzle → PostgreSQL. Deploy em Docker Compose (nginx + certbot), CI no GitHub Actions. ~12,6 mil linhas em `backend/src` + `frontend/src`.

Pontos fortes: motores de cálculo puros e testáveis, separados de I/O; validação Zod antes de calcular; JWT_SECRET obrigatório; IDOR corrigido; migrations versionadas; CI com Vitest + Playwright.

## Achados (ordenados por impacto)

### A. Risco / correção (fazer primeiro)
1. **CI não roda os testes de adubação.** `backend/package.json` → `"test": "node --require ts-node/register --test src/utils/calagem.test.ts"`. `adubacao.test.ts` (3 casos) fica fora do `npm test` e portanto do CI. Jest está nas devDependencies mas não é usado.
2. **Endpoint público grava no banco sem limite.** `POST /api/analises/calcular` (`analisesRoutes.ts:15-65`) persiste cada cálculo (fire-and-forget, `salvarAnalise(...).catch`) mesmo sem login; rate limit existe só em `/auth`. Permite encher a tabela `analises` e distorce `regional-stats`.
3. **Auth opcional reimplementada na rota** (`analisesRoutes.ts:25-33`, `jwt.verify` inline com `catch` vazio) em vez de um middleware `tokenOpcional` reutilizável.
4. **Vazamento de detalhes em erros 500** (`detalhes: error?.message` em `analisesRoutes.ts:62,111`); `server.ts` não tem error handler global, `helmet`, `/health`, nem porta configurável (3000 fixo, linha 35).
5. **CORS aberto por padrão** quando `CORS_ORIGIN` não está definido (`server.ts:18-19`) e `fazendasRoutes.ts` ainda sem Zod (grep: só 3 menções, sem schema próprio — confirmar).
6. **Schema sem integridade referencial.** Docs indicam FKs lógicas sem `references()`/índices (análises órfãs ao apagar talhão) **(grep por `references(` em `schema.ts` não retornou nada, mas não li o arquivo inteiro)**.
7. **Bulk de adubação sem transação** (loop item a item) **(não verificado no código atual)**.

### B. Estrutura / manutenibilidade
8. **Páginas gigantes no frontend:** `CalculadoraCompletaPage` 1.313 linhas, `NovaAnalisePage` 1.081, `CalculadoraPage` 1.066, `AdubacaoPage` 604. Misturam formulário, regras de visibilidade de blocos, chamada de API e render de resultado.
9. **Componentes duplicados:** `CampoNumerico`/`normalizarNumero`/`SelectPadrao` existem em `components/FormFields.tsx` (versão genérica) **e** localmente em `CalculadoraPage.tsx` e `AdubacaoPage.tsx`. Migração para `FormFields` ficou incompleta.
10. **Zod duplicado front/back:** `backend/src/schemas/calagemSchema.ts` (275 linhas) espelha `frontend/src/schemas/calagemSchema.ts` (262); idem adubação. `packages/shared-schemas` existe, mas está **fora do git e sem nenhum import** — decisão pendente.
11. **Rotas acessam o banco direto** (`analisesRoutes`, `adminRoutes`, `authRoutes` importam `db`/`drizzle`) enquanto `fazendas`/`adubacao` usam `database/*.ts`. Camadas inconsistentes; queries de estatística ficam dentro de handlers (`adminRoutes` 255 linhas).
12. **Dois fluxos de "análise pendente"** (`services/pendencias.ts` vs chave `adubacaoPendente` gravada direto em `AdubacaoPage`) **(não verificado se já unificado)**.
13. **Token JWT em `localStorage`** (AuthContext) — exposto a XSS; avaliar cookie httpOnly quando o domínio próprio sair.

### C. Documentação
14. **`docs/` está desatualizado e se contradiz:** `VERIFICACAO_IMPLEMENTACAO.md` já registrava branches mescladas, mas `00-visao-geral.md` ainda diz o contrário; `mapa-aplicacao.md`/`ref-*.md` ainda descrevem `motorStandalone` e `/api/standalone` (**removidos do código**: não há `standaloneRoutes.ts` nem rota em `server.ts`); `backend/.env` e `dist/` já **não estão** versionados (só `.env.example`); `sistema_efetivo` foi removido pela migration `0003`. São ~20 arquivos de docs + `docs_antigos/` — alto custo de manutenção.

## Roadmap proposto (cada fase = 1 branch/PR pequeno)

**Fase 1 — Segurança e CI (baixo risco, alto retorno)**
- `npm test` do backend passar a rodar `src/**/*.test.ts` (calagem + adubação); remover jest não usado ou adotá-lo de vez.
- Criar middleware `tokenOpcional` em `middlewares/authMiddleware.ts` e usá-lo em `analisesRoutes` (substitui o `jwt.verify` inline).
- Rate limit (`express-rate-limit`, já dependência) em `/analises/calcular` e `/adubacao/calcular`; decidir se cálculo anônimo deve persistir.
- Error handler global + `helmet` + `GET /health` + `PORT` via env; remover `detalhes: error.message` das respostas 500.
- Zod em `fazendasRoutes.ts`.

**Fase 2 — Banco**
- Migration adicionando `references()` com `ON DELETE` coerente (talhão→análises) e índices (`usuario_id`, `talhao_id`, `created_at`); antes, query para detectar órfãos existentes.
- Transação em `salvarLoteAnalises` e no bulk de adubação.

**Fase 3 — Camadas do backend**
- Mover queries de `analisesRoutes`/`adminRoutes`/`authRoutes` para `database/*.ts` (padrão já usado em `fazendas.ts`); rotas ficam só com HTTP + validação.

**Fase 4 — Frontend**
- Concluir a migração para `components/FormFields.tsx` (remover cópias locais).
- Quebrar as 3 páginas grandes: hooks por responsabilidade (estado do formulário, visibilidade de blocos, chamada de API) + subcomponentes de seção/resultado. Reaproveitar `CAMPOS_CALAGEM_COND` / `exigidoPeloCalagemSchema` (já em `NovaAnalisePage`).
- Unificar o fluxo de "análise pendente" em `services/pendencias.ts`.

**Fase 5 — Schemas compartilhados (decisão)**
- Recomendado: workspace npm com `packages/shared-schemas` realmente consumido por front e back (e versionado no git); alternativa mínima: apagar o pacote e manter a duplicação com teste de paridade.

**Fase 6 — Docs**
- Enxugar para: `README` + `mapa-aplicacao` + `ref-*` (3) + `registro-alteracoes`; arquivar o resto (`docs_antigos/`, `PLANO_DOCUMENTACAO`, `VERIFICACAO_*`). Corrigir as referências a `motorStandalone`, `.env`, `dist/`, `sistema_efetivo`. Regerar o mapa a partir do grafo (`graphify update`) para evitar nova divergência.

## Arquivos críticos (para quando houver implementação)
`backend/package.json`, `backend/src/server.ts`, `backend/src/routes/analisesRoutes.ts`, `backend/src/middlewares/authMiddleware.ts`, `backend/src/database/{schema,analises}.ts`, `frontend/src/components/FormFields.tsx`, `frontend/src/pages/{CalculadoraPage,CalculadoraCompletaPage,NovaAnalisePage,AdubacaoPage}.tsx`, `frontend/src/services/pendencias.ts`, `.github/workflows/main.yml`.

## Verificação (por fase)
- Backend: `npm test` (agora com adubação) verde; testes novos para `tokenOpcional` e rate limit; `npx tsc --noEmit`.
- Banco: `drizzle-kit generate` revisado; migration aplicada em cópia do banco com query de órfãos antes/depois.
- Frontend: `npm test` (Vitest) + `npm run test:e2e` (`calculadora-blocos.spec.ts`) sem regressão; comparar resultados de calagem/adubação nos 17 cenários do `docs/plano-testes-validacao-agronoma.md` antes/depois do refactor das páginas.
- Docs: grep por `motorStandalone`, `standalone`, `sistema_efetivo` em `docs/` deve retornar zero fora de histórico.

## Não fazer agora
Reescrever os motores de cálculo (ponto mais sólido e validado pela coordenação); trocar ORM/framework; mudar autenticação para cookie sem antes definir o domínio de produção.
