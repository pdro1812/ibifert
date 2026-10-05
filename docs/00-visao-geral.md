# Ibiferti — Visão Geral e Consolidação da Documentação

Documento-índice da auditoria/documentação completa do sistema, feita em
7 etapas conforme o [PLANO_DOCUMENTACAO.md](../PLANO_DOCUMENTACAO.md).
Nenhuma alteração de código foi feita durante o processo — este é o
fechamento da fase de leitura, com a lista priorizada de tudo que foi
encontrado, pronta para virar backlog de correção.

**Documentos desta série:**
1. [01-auth-e-dados.md](01-auth-e-dados.md) — Autenticação, banco de dados, roteamento
2. [02-calculo-calagem.md](02-calculo-calagem.md) — Motor de cálculo de calagem
3. [03-calculo-adubacao.md](03-calculo-adubacao.md) — Motor de cálculo de adubação
4. [04-cruds-apoio.md](04-cruds-apoio.md) — Fazendas, talhões, análises
5. [05-admin.md](05-admin.md) — Painel admin e monitoramento
6. [06-frontend-fluxos.md](06-frontend-fluxos.md) — Fluxos de usuário final

---

## 1. Arquitetura em uma página

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  Frontend (React 19 + Vite)  │        │  Backend (Express 5 + Drizzle)     │
│                               │  HTTP  │                                    │
│  pages/  → 15 telas           │◄──────►│  routes/    → 6 routers            │
│  services/api.ts (axios)      │  JWT   │  middlewares/ → auth (JWT)         │
│  schemas/ (zod, LOCAL)        │ Bearer │  schemas/  → zod (LOCAL)           │
│  contexts/AuthContext         │        │  services/  → motores de cálculo   │
│                               │        │  database/  → Drizzle + Postgres   │
└───────────────┬───────────────┘        └───────────────┬────────────────────┘
                │                                          │
                │            packages/shared-schemas       │
                │            (existe, MAS NÃO É USADO       │
                │             por nenhum dos dois lados)     │
                └──────────────────────────────────────────┘
```

**Fluxo de dado ponta a ponta** (calagem, exemplo representativo):
```
Usuário preenche formulário (CalculadoraPage)
  → validação zod local (frontend/src/schemas/calagemSchema.ts)
  → POST /api/analises/calcular (sem auth obrigatória)
      → validação zod no servidor (backend/src/schemas/calagemSchema.ts)
      → executarMotorCalagem() (backend/src/services/motorCalagem.ts)
          → lookup Tabela SMP (RS/SC 2016) sempre; fórmula polinomial como valor
            complementar (checkbox ou SMP > 6,3) + alerta se divergir >20% do SMP
      → salvarAnalise() — grava em `analises` (com ou sem usuario_id)
  → resposta renderizada na tela + botão PDF (jsPDF, client-side)
```
O mesmo padrão se repete para adubação, trocando a tabela/motor
(`motorAdubacao.ts` + `tabelasAdubacaoGraos.ts`) e a tabela do banco
(`analisesAdubacao`).

**Dois motores paralelos de calagem existem hoje**: o "oficial"
(`motorCalagem.ts`, usado por `/api/analises/*`) e um alternativo
(`motorStandalone.ts`, usado por `/api/standalone/calcular`, sem auth).
Eles divergem (ver §3, achados #3 e #4) e há uma tela pública
(`/validacao`) que os compara lado a lado.

## 2. O que está sólido

Vale registrar, não só os problemas: partes importantes do sistema estão
bem feitas.
- Autenticação (bcrypt, JWT, senha nunca vaza na resposta) segue o
  padrão correto na estrutura, mesmo com o problema pontual do segredo
  (§3, achado #1).
- Motor de calagem "oficial" implementa fielmente a spec do manual RS/SC
  2016, com 20 testes cobrindo quase todos os ramos — só um bug real
  encontrado nele (§3, achado #2), e ele é preciso e localizado.
- Admin: proteção por role é feita uma vez no nível do router
  (`adminRoutes.use(verificarToken, verificarRole(['ADMIN']))`) em vez de
  rota por rota — reduz risco de esquecer de proteger uma rota nova.
- Validação de servidor nunca confia só no cliente: toda rota de escrita
  revalida com zod, mesmo quando o frontend já validou antes.
- PDF gerado no cliente não vaza dado de terceiros — verificado.
- Estatísticas regionais (`/monitoramento`) são de fato agregadas e
  anônimas, como a própria tela promete.

## 3. Achados de segurança — lista única, por severidade

| # | Achado | Onde | Etapa |
|---|---|---|---|
| 1 | `JWT_SECRET` nunca configurado no `.env` — segredo hardcoded (`'super-secret-key'`) em uso real agora. Qualquer um com o código forja token de ADMIN. | `authMiddleware.ts`, `authRoutes.ts`, `analisesRoutes.ts` | 1 |
| 2 | `.env` com credencial do Postgres está commitado no git (`git ls-files` confirma), apesar do `.gitignore`. | `backend/.env`, commit `084b514` | 1 |
| 3 | **Divergência confirmada por execução**: `motorStandalone.ts` recomenda calagem em cenário onde `motorCalagem.ts` diz que não é necessário (PD com Restrição). Rota pública, sem auth. | `motorStandalone.ts` vs `motorCalagem.ts` | 3 |
| 4 | **Confirmado por execução**: trava de segurança de 5 t/ha (aplicação superficial) ausente no `motorStandalone.ts` — recomenda 5,25 t/ha sem alerta onde o motor oficial trava em 5,0 t/ha. | `motorStandalone.ts` | 3 |
| 5 | **Bug confirmado, suíte de teste falhando**: trava "solo tamponado" do PD Consolidado (`pH < 5.5`, `V>=65%`, `Al_sat<10%` → não precisa calagem) tem condição logicamente inalcançável — nunca dispara. Sistema recomenda calagem quando não deveria. | `motorCalagem.ts:113-128` | 2 |
| 6 | IDOR: 6 de 8 endpoints de fazenda/talhão/adubação por ID não checam dono — deletar fazenda de outro usuário, ler talhão/análise de outro usuário. | `fazendasRoutes.ts`, `adubacaoRoutes.ts` | 1, 4 |
| 7 | `standaloneRoutes.ts` sem autenticação **e** sem validação de schema — input cru direto pro motor de cálculo. | `standaloneRoutes.ts` | 1, 3 |
| 8 | `/validacao` é rota pública, linkada no menu principal — expõe a divergência do achado #3/#4 (e, sem a correção do #5, mostra falso "Batimento OK" no cenário mais crítico — confirmado por execução na Etapa 6). | `ValidacaoAgronomicaPage.tsx` | 4, 5, 6 |
| 9 | Bug funcional: `GET /api/adubacao` sempre retorna 401 (checa `req.user`, que nunca existe — deveria ser `req.userId`). | `adubacaoRoutes.ts:166-176` | 1 |
| 10 | Sem rate limiting em login/registro. | `authRoutes.ts` | 1 |
| 11 | CORS totalmente aberto (`cors()` sem config). Risco baixo hoje (auth via header, não cookie), mas vale restringir ao domínio de produção. | `server.ts` | 1 |
| 12 | Painel admin por usuário ignora adubação (só busca `analises`, nunca `analisesAdubacao`) — subrepresenta uso do sistema. | `adminRoutes.ts:176-214` | 5 |
| 13 | Fluxo "login para salvar" descarta o resultado calculado — perda de trabalho do usuário (pior na adubação, que não tem auto-save). | `CalculadoraPage.tsx`, `AdubacaoPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx` | 6 |

**Prioridade de correção sugerida**: 1 e 2 primeiro (comprometem toda a
autenticação e credenciais), depois 5 (bug agronômico confirmado com
teste falhando), depois 3/4/7/8 juntos (mesma causa raiz — decidir o
destino de `motorStandalone.ts`), depois 6 (IDOR), o resto conforme
disponibilidade.

## 4. Código morto / duplicado — lista única

| # | Item | Situação |
|---|---|---|
| 1 | `packages/shared-schemas` (pacote inteiro) | **Confirmado morto**: nenhum import em `backend/src` nem `frontend/src`. Já divergiu do schema real em uso (`identificacao` com regras diferentes). Decidir: remover ou adotar de verdade. |
| 2 | `motorStandalone.ts` + `standaloneRoutes.ts` | Não é "morto" (está em uso e é público), mas é uma **segunda implementação divergente** de regra já implementada em `motorCalagem.ts`. Decidir: fazer a rota chamar o motor oficial, ou remover se não há mais consumidor externo. |
| 3 | `sistemasEfetivosEnum` no schema do banco | Definido mas nenhuma coluna o usa — provável resquício de uma feature planejada e não implementada. |
| 4 | Colunas `pH_5_5` / `pH_6_5` da Tabela SMP | Não é código morto (a tabela inteira é usada), mas 2/3 das colunas nunca são lidas — `motorCalagem.ts` só usa pH-alvo 6.0. Confirmar se é intencional. |
| 5 | `require()` dinâmico dentro de handlers | `fazendasRoutes.ts:112,126` — inconsistente com o padrão de import do resto do arquivo. Limpeza trivial. |
| 6 | `test_insert.ts` na raiz do backend (fora de `src/`) | Não investigado a fundo — parece script de teste manual esquecido, mas não bloqueia nada. Confirmar antes de remover. |
| 7 | `adubacaoPendente` no `sessionStorage` | Escrito uma vez (`AdubacaoPage.tsx`), nunca lido em lugar nenhum do projeto — feature de "retomar após login" nunca terminada. |
| 8 | Botão "Salvar" da calculadora de calagem quando logado | Não é código morto tecnicamente, mas é uma ação de UI sem efeito real (o auto-save já aconteceu antes do clique). |

## 5. Checklist de backlog

> Atualizado após a rodada de correções em branches temáticas (ver §7).
> Itens marcados `[x]` foram corrigidos e verificados (testes e/ou
> chamadas reais contra o banco), mas **nenhuma branch foi mesclada em
> `main`** — todas aguardam sua revisão.

**Segurança crítica**
- [x] Gerar `JWT_SECRET` forte e remover o fallback hardcoded do código. — `fix/auth-hardening`
- [ ] Remover `backend/.env` do rastreamento do git e trocar credenciais do Postgres. — combinado que fica com você
- [x] Corrigir a condição da trava PD Consolidado em `motorCalagem.ts` (achado #5) e confirmar `npm test` volta a 20/20. — `fix/calagem-trava-pd-consolidado`
- [x] Decidir o destino de `motorStandalone.ts`/`standaloneRoutes.ts` — alinhado com o motor oficial (condições corrigidas), não removido. `fix/motor-standalone`
- [x] Adicionar checagem de dono (`usuario_id`) nos 6 endpoints de IDOR mapeados (Etapa 4, §3). — `fix/idor-fazendas-adubacao`
- [x] Corrigir `req.user` → `req.userId` em `GET /api/adubacao`. — `fix/auth-hardening`

**Segurança — menor urgência**
- [x] Rate limiting em `/api/auth/login` e `/register`. — `fix/security-hardening-menor`
- [x] Restringir CORS ao domínio de produção quando definido — feito via `CORS_ORIGIN` configurável (permissivo por padrão até o domínio existir). `fix/security-hardening-menor`
- [ ] Validação de schema (zod) em `fazendasRoutes.ts` (hoje é `if (!campo)` manual). — não abordado ainda.

**Produto / completude**
- [x] Painel admin por usuário incluir adubação (não só calagem). — `fix/admin-adubacao-metrics`
- [x] Implementar de verdade o fluxo "login para salvar" (calagem e adubação). — `fix/login-pendente-flow` (sem teste end-to-end em navegador real, ver commit)
- [ ] Fracionamento de N (Semeadura x Cobertura) — gap já apontado na auditoria antiga, ainda aberto.
- [ ] Definir valor numérico para "reposição parcial" de P/K no 2º cultivo (hoje fica 0 com texto ambíguo).

**Limpeza / dívida técnica**
- [ ] Decidir destino de `packages/shared-schemas` — não removido: nunca foi commitado no git (untracked desde o início), apagar seria irreversível sem aprovação explícita.
- [ ] Remover `sistemasEfetivosEnum` não utilizado — não removido: o tipo `sistema_efetivo` existe de verdade no Postgres (confirmado via `\dT+`), removê-lo exige uma migração `DROP TYPE` que precisa ser revisada antes de rodar, não é só edição de código.
- [x] Padronizar imports em `fazendasRoutes.ts` (tirar os `require()` inline). — resolvido de quebra em `fix/idor-fazendas-adubacao`
- [x] Confirmar e remover `test_insert.ts`. — `chore/cleanup-codigo-morto`
- [ ] Ampliar cobertura de teste do motor de adubação (hoje 2 casos, contra 20 da calagem).

## 7. Branches de correção abertas (ainda não mescladas)

| Branch | Resolve | Verificação feita |
|---|---|---|
| `fix/auth-hardening` | JWT_SECRET obrigatório + bug `req.user` | typecheck, `npm test`, login real no app |
| `fix/calagem-trava-pd-consolidado` | Trava que nunca disparava | baseline 19/20 → 20/20 |
| `fix/motor-standalone` | Divergência entre os dois motores de calagem | comparação lado a lado, incluindo caso de fronteira |
| `fix/idor-fazendas-adubacao` | 6 endpoints sem checagem de dono | 2 usuários reais criados via API, todos os ataques bloqueados (404), acesso legítimo OK |
| `fix/security-hardening-menor` | Rate limit + CORS configurável | 429 confirmado ao vivo após 20 tentativas |
| `fix/admin-adubacao-metrics` | Painel admin ignorava adubação | usuário de teste real com adubação, `totalAnalises` corrigido |
| `fix/login-pendente-flow` | Fluxo "login para salvar" descartava o resultado | typecheck (sem erros novos) + HMR sem erro; sem teste E2E em navegador |
| `chore/cleanup-codigo-morto` | `test_insert.ts` removido | `npm test` sem impacto |

Todas as branches partem de `main` de forma independente (não empilhadas
umas nas outras) — para ter todas as correções juntas, cada uma precisa
ser revisada e mesclada individualmente.

## 6. Metodologia seguida (para referência)

Todas as etapas seguiram a metodologia registrada no
[PLANO_DOCUMENTACAO.md](../PLANO_DOCUMENTACAO.md): fase de leitura sem
alterar código, achados críticos sinalizados assim que encontrados
(não só no fechamento), e — lição aprendida já na Etapa 2 — verificação
empírica (rodar testes, escrever scripts de comparação pontuais) antes de
reportar uma hipótese de bug como confirmada, em vez de confiar só na
leitura do código. Essa prática pegou pelo menos 3 achados que uma
leitura estática sozinha não teria confirmado com a mesma certeza
(achados #3, #4 e #5 da tabela de segurança).

Nenhuma correção foi aplicada durante as 7 etapas. O próximo passo, a
seu critério, é abrir branches isoladas por item do checklist acima,
seguindo o fluxo de correção segura já combinado (baseline antes/depois
para qualquer mudança em motor de cálculo, sua aprovação antes de
qualquer merge).
