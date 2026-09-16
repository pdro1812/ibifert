# Verificação: docs/00-06 e PLANO_DOCUMENTACAO.md vs. código atual (branch `main`)

Data da verificação: 2026-08-22. Conferido lendo o código atual em `main` e
comparando com as afirmações dos 7 arquivos (`docs/00-visao-geral.md` até
`docs/06-frontend-fluxos.md`, mais `PLANO_DOCUMENTACAO.md`).

## 0. Achado mais importante: os documentos estão desatualizados sobre o merge

`PLANO_DOCUMENTACAO.md` e `docs/00-visao-geral.md` afirmam explicitamente:

> "nenhuma branch foi mesclada em `main`" / "Todas as branches partem de
> `main` de forma independente... para ter todas as correções juntas, cada
> uma precisa ser revisada e mesclada individualmente."

**Isso não é mais verdade.** `git log --oneline --all --graph` mostra que
**todas as 8 branches de correção listadas no §7 do `00-visao-geral.md` já
estão mescladas em `main`**, em sequência:

```
fix/auth-hardening → fix/calagem-trava-pd-consolidado → fix/motor-standalone
→ fix/idor-fazendas-adubacao → fix/security-hardening-menor
→ fix/admin-adubacao-metrics → fix/login-pendente-flow
→ chore/cleanup-codigo-morto
```

Ou seja: o checklist de "backlog" dos documentos deveria ser lido como já
**aplicado em `main`**, não como pendente de merge. Também não existe
`docs/07-*.md` (o pedido citou "00 ao 07", mas a série vai só de 00 a 06 —
a Etapa 7 foi entregue dentro do próprio `00-visao-geral.md`, conforme o
próprio índice do arquivo declara).

## 1. Checklist de segurança crítica (00-visao-geral.md §5) — todos implementados

| Item | Status no código atual |
|---|---|
| `JWT_SECRET` obrigatório, sem fallback hardcoded | ✅ `backend/src/config/env.ts` lança erro no boot se `JWT_SECRET` não estiver definido; `authMiddleware.ts`, `authRoutes.ts`, `analisesRoutes.ts` importam de lá — nenhum `'super-secret-key'` restante no código. |
| Trava PD Consolidado (`motorCalagem.ts` achado #5/§6.0) | ✅ `motorCalagem.ts:99-127` — a condição redundante `pH_agua >= 5.5` dentro do segundo `if` foi removida; a trava agora é alcançável. |
| `motorStandalone.ts` alinhado ao motor oficial | ✅ `motorStandalone.ts:109-119` aplica o mesmo limite de 5,0 t/ha com o mesmo texto de alerta do motor oficial. Não foi unificado num único motor (decisão registrada: "alinhado, não removido"), mas a divergência de resultado que gerava o achado crítico não existe mais nos pontos verificados. |
| 6 endpoints de IDOR (fazendas/talhões/adubação) | ✅ `fazendasRoutes.ts` — todos os handlers agora recebem `usuarioId` do token e passam para as funções de banco (`deleteFazenda(id, usuarioId)`, `getTalhaoById(id, usuarioId)` etc.), retornando 404 se não pertence ao usuário. `adubacaoRoutes.ts:181-186` (`GET /:id`) também passa `req.userId`. |
| `req.user` → `req.userId` em `GET /api/adubacao` | ✅ `adubacaoRoutes.ts:168-171` usa `req.userId` corretamente. |

## 2. Checklist de segurança — menor urgência

| Item | Status |
|---|---|
| Rate limiting em login/registro | ✅ `authRoutes.ts` importa `express-rate-limit` (`limitadorAuth`), `express-rate-limit` está em `backend/package.json`. |
| CORS restringível via `CORS_ORIGIN` | ✅ `server.ts` lê `process.env.CORS_ORIGIN`, permissivo por padrão (comportamento documentado). |
| Validação zod em `fazendasRoutes.ts` | ❌ **Ainda não feita**, como o próprio checklist já indicava (`[ ]`). Confirmado: `fazendasRoutes.ts` continua validando só com `if (!campo)`, sem import de zod. |

## 3. Produto / completude

| Item | Status |
|---|---|
| Painel admin por usuário incluir adubação | ✅ `adminRoutes.ts` agora consulta `analisesAdubacao` tanto na visão global (`/analises`, unificando `tipo: 'ADUBACAO'`/`'CALAGEM'`) quanto no `/users/:id/full-details` e no `totalAnalises` agregado (`totalAnalisesCalagem + totalAnalisesAdubacao`). |
| Fluxo "login para salvar" (calagem e adubação) | ✅ Implementado via `frontend/src/services/pendencias.ts` (`recuperarAnalisePendente`), chamado em `LoginPage.tsx` e `RegisterPage.tsx`. `AdubacaoPage.tsx:106` ainda grava a chave `adubacaoPendente` diretamente em `sessionStorage` (não via o novo serviço) — vale confirmar se essa chave também é lida por `pendencias.ts` ou se ficou um caminho não unificado; não aprofundei ao nível de "funciona ponta a ponta" (o checklist já registra "sem teste E2E em navegador real"). |
| Fracionamento de N (semeadura x cobertura) | ❌ **Ainda não implementado**, como o checklist já indicava. Confirmado: não há tabela de cronograma de N em `tabelasAdubacaoGraos.ts`; K₂O já tem o fracionamento (`k2o_semeadura_kg_ha` em `motorAdubacao.ts:180`), N continua só com dose total. |
| Valor numérico para "reposição parcial" (2º cultivo) | ❌ **Ainda não implementado**. Confirmado: `motorAdubacao.ts:103,132` ainda atribui só o texto `"Reposição parcial — a critério do técnico"`, sem calcular a dose. |

## 4. Limpeza / dívida técnica

| Item | Status |
|---|---|
| `packages/shared-schemas` — decisão pendente | ⚠️ Consistente com o documentado: pacote continua existindo (`packages/shared-schemas/src/*`), **não está rastreado no git** (`git ls-files packages/` retorna vazio) e **nenhum import** dele em `backend/src` ou `frontend/src` (grep vazio) — confirma que segue morto e não removido, como o checklist registra. |
| `sistemasEfetivosEnum` — decisão pendente (remoção exige migração) | ⚠️ Parcialmente impreciso no doc `02-calculo-calagem.md §6.3`: ele afirma que "**nenhuma** coluna da tabela `analises` usa esse enum". Isso está **incorreto/desatualizado** — o schema atual (`backend/src/database/schema.ts:104`) tem sim uma coluna `sistema_efetivo: sistemasEfetivosEnum('sistema_efetivo')` na tabela `analises`. Na prática o achado continua válido no sentido que importa (é morto *funcionalmente*): `salvarAnalise()` em `backend/src/database/analises.ts` nunca escreve nesse campo no `.values()` do insert, então a coluna sempre fica `null`. Vale só corrigir o texto do doc — a coluna existe, só não é populada. |
| `require()` inline em `fazendasRoutes.ts` | ✅ Removido — arquivo atual só usa imports no topo, nenhum `require(` encontrado. |
| `test_insert.ts` na raiz do backend | ✅ Removido (`git log`: commit `bf201ea "chore: remove script de debug test_insert.ts"`; arquivo não existe mais em `backend/`). |
| Ampliar cobertura de teste do motor de adubação | ❌ **Ainda não feita**. `adubacao.test.ts` continua com poucos casos (3 `it`/`test` encontrados — o doc citava 2, hoje está em 3, ainda muito abaixo dos 20 de `calagem.test.ts`). |

## 5. Item explicitamente fora de escopo (combinado com o usuário)

| Item | Status |
|---|---|
| `.env` do backend rastreado no git / trocar credenciais Postgres | ❌ Confirmado ainda pendente — `git ls-files` mostra `backend/.env` rastreado, com a mesma credencial (`admin`/`adminpassword`) documentada. Como o próprio plano registra, isso é intencionalmente deixado para o usuário resolver, então **não é uma inconsistência**, é o esperado. |

## 6. Conferência pontual de afirmações específicas dos docs (amostragem, não exaustiva)

- **`authMiddleware.ts`** (doc 01): comportamento de `verificarToken`/`verificarRole` bate exatamente com o descrito (popula `req.userId`/`req.userRole`, 401/403 conforme documentado).
- **`server.ts`**: registro de rotas (`/api/auth`, `/api/analises`, `/api/adubacao`, `/api/fazendas`, `/api/admin`, `/api/standalone`) bate com a matriz de rotas do doc 01.
- **Fórmula polinomial e trava de 5t/ha do `motorCalagem.ts`** (doc 02): não recontei a fórmula linha a linha nesta verificação (já auditada com testes na Etapa 2), mas a suíte `calagem.test.ts` com 20 casos permanece presente e a trava específica do achado #5 foi confirmada corrigida (item 1 acima).
- **`adminRoutes.use(verificarToken, verificarRole(['ADMIN']))` global** (doc 00/05): não relido linha a linha nesta passada, mas o padrão de proteção a nível de router é coerente com o que foi encontrado nas outras rotas administrativas conferidas.

## 7. Resumo

Dos itens do checklist de backlog em `docs/00-visao-geral.md`:
- **10 de 13 itens marcados como corrigidos (`[x]`)** foram confirmados como
  realmente presentes no código de `main` — e, ao contrário do que o texto
  do documento sugere, **já estão mesclados em `main`**, não apenas em
  branches isoladas aguardando revisão.
- **Os 4 itens marcados como pendentes (`[ ]`)** foram confirmados como
  realmente ainda não implementados (zod em `fazendasRoutes.ts`, remoção de
  `shared-schemas`, remoção de `sistemasEfetivosEnum`, fracionamento de N,
  valor numérico de reposição parcial — nota: são 5 itens `[ ]`, não 4; a
  limpeza do `.env` é o 6º item pendente, mas está fora do escopo combinado).
- **1 imprecisão factual pequena** encontrada no doc 02 (§6.3) sobre a coluna
  `sistema_efetivo` — vale corrigir o texto, não o código.
- **Nenhuma divergência de comportamento** encontrada entre o que os docs
  descrevem como corrigido e o que o código de `main` realmente faz.

**Ação recomendada**: atualizar o cabeçalho/§5/§7 de `docs/00-visao-geral.md`
para refletir que as branches já foram mescladas (o texto atual ainda diz
o contrário), já que isso pode levar a retrabalho (ex.: alguém reabrir uma
branch achando que a correção não está em `main`).
