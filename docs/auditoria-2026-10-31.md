# Auditoria pré-versão final — Ibiferti (31/10/2026)

Escopo: branch `audit/pre-versao-final`, criada a partir de `feat/alteracoes-coordenacao` (9f19406), que já contém `origin/main`. Auditoria **só de leitura**: nenhum código foi alterado. O servidor de produção não foi acessado e nenhum `db:push`/`db:migrate` foi rodado.

Como foi feita:

- Leitura de todo o backend (`backend/src`, ~3.500 linhas), com `graphify query` antes de cada busca.
- Três subagentes em paralelo cobriram dependências, frontend e infra/segredos. Os achados deles foram reconferidos por amostragem.
- Os achados do backend foram reproduzidos de ponta a ponta: backend compilado (`npm run build`) rodando contra um Postgres descartável (PGlite + `@electric-sql/pglite-socket`), com as 7 migrações de `backend/drizzle/` aplicadas em ordem. Os roteiros `servidor.mjs`, `sondas.mjs` e `sonda2.mjs` estão no scratchpad da sessão e não foram versionados.
- Severidades: Crítica / Alta / Média / Baixa / Info. Status: **confirmado** (com evidência reproduzida ou no código) ou **suspeita** (depende de algo que não pude verificar).

---

## 1. Resumo executivo

**O sistema ainda não está pronto para a versão final.** O núcleo de cálculo está testado (64 testes no backend e 81 no frontend, todos passando) e a autenticação está bem montada (cookie httpOnly, `sameSite=strict`, bcrypt, rate limit por IP real). Bloqueiam a versão final:

1. **Segredos antigos de produção continuam públicos no GitHub** pelos refs `refs/pull/*` (AUD-01). É preciso confirmar que a troca foi feita no servidor.
2. **Um usuário consegue gravar análises no talhão de outro** (AUD-02).
3. **Credenciais de teste vêm pré-preenchidas na tela de login de produção** (AUD-03).
4. **Recomendações que não saíram do motor:** a adubação salva grava o resultado mandado pelo cliente (AUD-04), e os dois motores aceitam entradas que geram doses absurdas (AUD-05).
5. **Risco de perda de dados:** `drizzle-kit push` roda a cada boot (AUD-07), não há backup (AUD-08), e o Node 20 está sem suporte desde 30/04/2026 (AUD-09).

As correções de 2 a 4 são pequenas (de 1 a 10 linhas cada).

---

## 2. Tabela de achados

Colunas: Sev. = severidade; Esf. = esforço (P = horas, M = 1 a 2 dias, G = mais). Linhas no formato `arquivo:linha`. O detalhe de cada achado Crítico, Alto e Médio está na seção 3.

| ID | Sev. | Categoria | Onde | Evidência (resumo) | Impacto real | Correção proposta | Esf. | Status |
|---|---|---|---|---|---|---|---|---|
| AUD-01 | **Alta** (Crítica se o servidor ainda usar o JWT antigo) | Segredos | GitHub `refs/pull/1,3,5,11`; commits 084b514, 50ffa23, 263e19e, 801211f | Repo `PUBLIC`; `git ls-remote` mostra os refs de PR apontando para a linhagem sem "REDACTED" | Com o JWT_SECRET antigo dá para forjar token de ADMIN | Confirmar a troca dos segredos no servidor; pedir ao GitHub Support a remoção dos refs e GC | P/M | Exposição confirmada; troca não verificada |
| AUD-02 | **Alta** | Autorização (IDOR) | `analisesRoutes.ts:82-116`, `adubacaoRoutes.ts:108`, `adubacaoRoutes.ts:126,146` | Sonda P1: A grava no talhão de B, B vê a análise no talhão e não consegue excluí-la (404) | Recomendação forjada aparece no talhão da vítima; exclusão de conta apaga dados de terceiros | Checar `getTalhaoById(talhao_id, userId)` antes de gravar, como `/:id/salvar` já faz | P | Confirmado |
| AUD-03 | **Alta** se a conta existir; senão Média | Credencial | `frontend/src/pages/LoginPage.tsx:36` | `defaultValues: { email: 'teste@email.com', senha: '123456' }`, presente também no bundle | Se a conta existir em produção, qualquer visitante entra com um clique | Remover os defaults; apagar a conta se existir | P | Código confirmado; existência da conta não verificada |
| AUD-04 | Média | Confiança no cliente | `adubacaoRoutes.ts:95,109` | Sonda P2: `resultado` forjado (N = 99.999 kg/ha) gravado em `recomendacao_json` | Histórico, PDF e painel admin mostram recomendação que não saiu do motor | Recalcular com `executarMotorAdubacao`, como o `PUT /:id` faz (`:215`) | P | Confirmado |
| AUD-05 | Média | Cálculo agronômico | `backend/src/schemas/calagemSchema.ts` (PRNT, SMP, Al, CTC), `adubacaoSchema.ts:21-42` | Sonda P6: PRNT 0,01 → 61.000 t/ha; SMP −50 aceito; rendimento 1.000 t/ha → 14.980 kg N/ha | API devolve e grava doses absurdas; o front valida, a API não | Faixas agronômicas no backend (decisão da coordenação) e testes | P/M | Confirmado |
| AUD-06 | Média | Vazamento de informação | 22 respostas 500 (lista em 3.6) | Sonda P4: `detalhes` traz a query SQL inteira e os parâmetros (id do usuário) | Revela schema e parâmetros; id inválido vira 500 | Handler de erro central, mensagem genérica, validar UUID (400/404) | P | Confirmado |
| AUD-07 | Média | Migração/infra | `backend/entrypoint.sh:9`, `Dockerfile.prod:29-34` | `npx drizzle-kit push` a cada start; `drizzle/*.sql` nunca aplicados; sem `set -e`, sem `exec` | Mudança destrutiva aplicada ou boot travado em prompt sem TTY; servidor sobe com schema velho se o push falhar | Fluxo da seção 3.7 (migrator + baseline) | M | Config confirmada; comportamento sem TTY é suspeita |
| AUD-08 | Média | Disponibilidade/dados | `docker-compose.prod.yml` | Só o volume `pgdata_prod`, sem serviço de backup | Perda irrecuperável (agravada por AUD-07) | Backup diário com retenção e cópia fora do host | M | Repo confirmado; servidor é suspeita |
| AUD-09 | Média | Runtime sem suporte | `backend/Dockerfile.prod:4,15`, `frontend/Dockerfile.prod:1`, `.github/workflows/main.yml:19,40` | Node 20 com EOL em 30/04/2026 ([schedule oficial](https://github.com/nodejs/Release/blob/main/schedule.json)) | Sem correções de segurança no runtime de produção | `node:22-alpine` (até 04/2027) ou `node:24-alpine` (até 04/2028), com versão fixa | P/M | Confirmado |
| AUD-10 | Média | Dependências | `backend/package-lock.json`, `frontend/package-lock.json` | `npm audit --omit=dev`: backend 18 (1 crítica, 8 altas), frontend 12 (11 altas) | DoS do body-parser explorável; demais com exposição baixa (seção 4) | express 5.3.0, zod 4.6.7, express-rate-limit 8.7.2, react-router 7.18.x, axios 1.21, vite 8.3.x | P | Confirmado |
| AUD-11 | Média | Integridade de dado público / LGPD | `analisesRoutes.ts:27-59,135-227` | Sonda P7: "cidade" `<img src=x onerror=alert(1)>` em SP aparece no filtro público; cidade com 1 registro mostra os valores exatos | Monitoramento poluível por anônimos; contagem inflada (cada clique em Calcular é um registro); reidentificação em cidade pequena | Validar município; contar só cálculos distintos ou salvos; ocultar cidades com n < k | M | Confirmado |
| AUD-12 | Média (funcional) | Corretude | `frontend/src/services/api.ts:62-127`, `backend/src/database/analises.ts:50-54`, `analisesRoutes.ts:110` | O payload nunca inclui `monitoramento`; as 5 colunas 10–20 cm ficam nulas | Painel "Problemas de monitoramento" sempre 0 para cálculos da calculadora e da inserção rápida | Enviar o objeto `monitoramento` e gravar `sistema_manejo` efetivo | P/M | Confirmado (código) |
| AUD-13 | Média | Consultas | `analises.ts:177`; `adubacao.ts:22-49`; `adminRoutes.ts:83-207` | Sonda P5: 102 calagens, histórico mostra 100 sem aviso | Histórico some sem aviso; endpoints admin devolvem a tabela inteira | Paginação com cursor e total | M | Confirmado |
| AUD-14 | Média | Infra/headers | `frontend/nginx.conf:16-44`; `backend/src/server.ts` | Nenhum `add_header`; `server_tokens` on; `X-Powered-By: Express` (sonda P12) | Clickjacking (excluir conta/análise), SSL-strip no primeiro acesso, sem segunda barreira a XSS | HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy, `server_tokens off`, `app.disable('x-powered-by')` | P/M | Confirmado |
| AUD-15 | Média | Segredo local | `ssh-key-2026-04-25.key` (raiz) | RSA sem passphrase; chave de `ubuntu@ibifert.duckdns.org` segundo `docs/trocar-segredos-producao.md:39,43`; nunca commitada | Qualquer ferramenta ou backup que leia a pasta ganha shell na produção | Mover para `~/.ssh`, pôr passphrase, considerar trocar | P | Confirmado |
| AUD-16 | Média | Disponibilidade | `docker-compose.prod.yml:52-57` | O serviço `certbot` não tem `command`; não há `renew` nem reload do nginx | Certificado expira em 90 dias, salvo cron não documentado | Loop `certbot renew` mais reload periódico, ou cron documentado | P | Repo confirmado; servidor é suspeita |
| AUD-17 | Média | LGPD | `CalculadoraCompletaPage.tsx:191,633-651`; `FeedbackPage.tsx`; `RegisterPage.tsx` | Selo "Cálculo temporário", mas tudo é gravado (com identificação livre) sem prazo; não há política de privacidade | Falta de transparência (art. 6º VI e 9º); feedback com telefone sem retenção nem como pedir exclusão | Política de privacidade, texto de finalidade, retenção e não gravar `identificacao` em registro anônimo | M | Confirmado |
| AUD-18 | Média | Validação desigual | `analisesRoutes.ts:80-116`; `adubacaoRoutes.ts:150`; `analisesRoutes.ts:52-53` | `/analises/bulk` sem validação de `uf`/`cidade`/`modo_al_sat`; `/adubacao/bulk` usa `amostra.uf \|\| 'RS'` e aceitou `SP` (sonda P2b); `modo_al_sat` inválido dá `id: null` silencioso (P11); data 2024-02-31 dá 500 | Dados inválidos no banco e no painel público; usuário não consegue salvar e não sabe por quê | `LocalizacaoSchema` e um schema de lote com `z.array().max(n)`; validar `modo_al_sat`; datas reais | P/M | Confirmado |
| AUD-19 | Baixa | Sessão | `authMiddleware.ts:14,24,53,64-79` | Sonda P8: depois de excluir a conta, o mesmo cookie ainda cria fazenda (201) | Logout e exclusão não revogam; papel fica congelado no token por 7 dias; dados órfãos depois da exclusão | Conferir usuário/versão de sessão no `verificarToken`; `algorithms: ['HS256']`; encurtar a validade | P/M | Confirmado |
| AUD-20 | Baixa | Validação/UX | `adubacaoRoutes.ts:85`, `fazendasRoutes.ts:58,112`, `feedbackRoutes.ts:18` | Sonda P3: 400 com `{error:'Erro de validação'}` e sem detalhes (`err.errors` não existe no zod 4) | O front mostra erro genérico em vez do campo inválido | Usar `err.issues` (ou o helper `responderErroValidacao`) | P | Confirmado |
| AUD-21 | Baixa | Auth | `authRoutes.ts:44,48`; `rateLimit.ts:36-43` | Sonda P9: `Caso@Exemplo.test` e `caso@exemplo.test` viram duas contas; o cadastro responde "E-mail já cadastrado." | Contas duplicadas; enumeração pelo cadastro (limitada a 5/h por IP); travar o login de terceiro por 15 min | Normalizar e-mail (`trim().toLowerCase()`) e índice único em `lower(email)` | P | Confirmado |
| AUD-22 | Baixa | Banco | `drizzle/0000-0006`; `fazendas.ts:41-51,68-95,125-134` | Nenhuma FK nem índice além das PKs e do e-mail; exclusões em várias etapas sem transação; N+1 em `GET /fazendas` | Órfãos (análises com talhão apagado); lentidão quando os dados crescerem | Índices em `usuario_id`, `talhao_id`, `fazenda_id`, `criado_em`; FKs; transações; join único | M | Confirmado |
| AUD-23 | Baixa | CI | `.github/workflows/main.yml:3-6,92,100` | Só roda em push na `main`; sem PR, lint, tsc nem build antes do merge; só `:latest`; actions por tag; `main` sem proteção; lint do front com 21 erros | Erro descoberto depois do merge; sem rollback de imagem | `pull_request`, lint/tsc/build, tag `${{ github.sha }}`, proteção da `main` | P/M | Confirmado |
| AUD-24 | Baixa | Imagens | Dockerfiles e compose | `nginx:alpine`, `certbot/certbot` sem tag, `postgres:15-alpine`; `--only=production` obsoleto; 85 peers opcionais (Prisma, hono, mysql2) entram na imagem; `src` e drizzle-kit em produção; sem healthcheck | Build não reproduzível, mais superfície (install scripts do Prisma) | Fixar tags/digest, regenerar o lock sem Prisma, `--omit=dev`, healthchecks | P/M | Confirmado |
| AUD-25 | Baixa | Rate limit | `nginx.conf:40`, `server.ts:20` | Sonda P10 e teste do `proxy-addr`: com IPv4 o XFF forjado é ignorado | Forjável se o `$remote_addr` chegar privado (IPv6 via docker-proxy ou acesso pelo próprio host) | `X-Forwarded-For $remote_addr` no nginx e `trust proxy` = sub-rede do compose | P | Suspeita (depende da rede do servidor) |
| AUD-26 | Baixa | Frontend | `AdminUsersPage.tsx:115-125`, `MinhaContaPage.tsx:19-27`, `services/ibge.ts:8-10` | Buscas sem cancelamento; IBGE sem `response.ok` nem `.catch` | Admin pode ver os dados de outro usuário sob o nome errado; cidade salva incompatível com a UF; queda do IBGE trava os formulários | Flag `ativo`/`AbortController`; lista de municípios estática ou via backend | P | Confirmado |
| AUD-27 | Baixa | CORS | `server.ts:26-27` | Sonda P12: `Access-Control-Allow-Origin: *` (`CORS_ORIGIN` não está no compose de produção) | Baixo: sem `credentials` e com cookie `strict` | `CORS_ORIGIN=https://ibifert.duckdns.org` | P | Confirmado |
| AUD-28 | Baixa | Validação | `authSchema.ts:12-19`, `fazendasSchema.ts`, `CalagemSchema.identificacao` | Sem `max` em nome, cidade, telefone, nomes de fazenda/talhão e identificação; senha sem máximo (bcrypt corta em 72 bytes) | Registros de até 100 kB por campo; senha longa com o mesmo prefixo é aceita | `max()` coerente com o front (ex.: 120) e senha até 72 bytes | P | Confirmado |
| AUD-29 | Info | Código/deps sem uso | `backend/package.json` (jest, ts-jest, bloco `"jest"`), `frontend/package.json:18,33` (cors), `package.json`/lock/`node_modules` da raiz, `adubacao.ts:30`, `fazendas.ts:9` | grep sem nenhum import; o `node_modules` da raiz é resto de workspaces | Ruído e handlebars (crítica, dev) sem necessidade; dependência fantasma em dev | Remover; declarar `ts-node` | P | Confirmado |
| AUD-30 | Info | Docs/comentários | `docs/01-auth-e-dados.md:68,93-94`, `docs/00-visao-geral.md:73,88,108`, `VERIFICACAO_IMPLEMENTACAO.md:46`, `entrypoint.sh:3-6`, `server.ts:17`, `AuthContext.tsx:79`, `pendencias.ts:28-33`, mensagem do PRNT | Descrevem token em localStorage, IDORs já corrigidos, `motorStandalone`, "o servidor nunca confia no cliente", espera pelo banco, e "PRNT entre 1 e 100" mas aceita 0,01 | Leitor (ou IA) toma decisão em cima de informação falsa | Atualizar ou remover | P | Confirmado |
| AUD-31 | Info | Testes | `backend/src/utils/*.test.ts`; `frontend/src/services/api.ts:62-127`; `e2e/calculadora-salvar.spec.ts:64-73` | Backend sem nenhum teste de rota ou banco; `auth.test.ts` monta app próprio (não testa `server.ts`); `sanitizarPayloadCalagem` sem teste; e2e para no `/login` | AUD-02, 04, 06, 12 e 18 passaram sem ser pegos | Testes de rota com PGlite (o roteiro desta auditoria serve de base) | M | Confirmado |
| AUD-32 | Baixa | Segredos (local) | branches locais `main`, `fix/segredos-env`, `docs/runbook-servidor`, `feat/seguranca-auth-lgpd` e outras | Contêm 084b514 (linhagem sem "REDACTED"); a `main` local divergiu de `origin/main` | Um push dessas branches republica os segredos antigos | Apagar ou recriar a partir de `origin/main` | P | Confirmado |
| AUD-33 | Info | Dev | `docker-compose.yml:6,21,40`, `vite.config.ts:10-19` | Portas 3000, 5173 e 5433 em 0.0.0.0; `server.host: true` com advisories do vite dev | Exposição na rede local da máquina de desenvolvimento | Prefixar com `127.0.0.1:` | P | Confirmado |

---

## 3. Detalhe dos achados principais

### 3.1 AUD-01: segredos antigos públicos pelos refs de PR

- `gh repo view` devolve `"visibility":"PUBLIC"` (https://github.com/pdro1812/ibifert).
- O histórico da `main` foi reescrito com `***REDACTED***`. Mesmo assim, `git ls-remote origin 'refs/pull/*'` ainda mostra `refs/pull/1 = 50ffa23`, `refs/pull/3 = 263e19e`, `refs/pull/5 = b0cadd2` (descendente de 084b514, que adicionou `backend/.env`) e `refs/pull/11 = 801211f`. O GitHub não reescreve refs de PR com force-push, e a API devolve esses commits sem login.
- Os valores antigos foram comparados com os atuais (`.env.producao`) **só por hash**, sem imprimir nenhum valor. O JWT_SECRET antigo tinha 21 caracteres e o atual tem 64. A senha antiga do Postgres tinha 13 e a atual tem 24. Os hashes são diferentes, então os valores locais já foram trocados.
- O que falta confirmar é se o **servidor** usa os valores novos. O `env.ts:9` recusa JWT com menos de 32 caracteres em produção, mas só na imagem publicada em 31/10.
- **Correção:**
  1. Confirmar no servidor os passos 1 a 5 de `docs/trocar-segredos-producao.md`, incluindo o `ALTER USER`.
  2. Abrir chamado no GitHub Support pedindo a remoção dos refs `pull/1, 3, 5, 11` e garbage collection. Outra saída é recriar o repositório ou torná-lo privado.
  3. Tratar os valores antigos como comprometidos para sempre.

### 3.2 AUD-02: IDOR de escrita em talhão

`POST /analises/:id/salvar` confere o dono do talhão (`analisesRoutes.ts:281-284`). As rotas irmãs não conferem:

- `POST /api/analises/bulk`: `talhao_id` vem do corpo (`:83`) e é gravado direto (`:108`).
- `POST /api/adubacao/salvar`: `talhao_id: dadosForm.talhao_id` (`:108`).
- `POST /api/adubacao/bulk`: `talhao_id` (`:126,146`).

Reprodução (sondas P1, P2 e sonda2):

1. A grava uma calagem no talhão de B.
2. `GET /fazendas/talhoes/<talhão de B>/analises` (sessão de B) lista a análise de A com `identificacao: "INJETADA POR A"`, e ela também aparece como `ultimaAnalise` no card do talhão.
3. B tenta `DELETE /analises/<id>` e recebe **404**: a vítima não consegue remover a análise.
4. Quando B exclui a conta, a transação de `authRoutes.ts:163-164` apaga também a análise de A, porque ela está ligada a um talhão de B. O histórico de A passou de 1 para 0 análises.

A exploração exige o UUID do talhão. Ele não dá para adivinhar, mas aparece na URL `/dashboard/talhao/:id`, que pode ser compartilhada.

**Correção:** conferir `getTalhaoById(talhao_id, req.userId)` nas três rotas e devolver 404 se o talhão não for do usuário. Teste de regressão: a sonda P1 vira um teste de rota.

### 3.3 AUD-03: credenciais pré-preenchidas no login

`LoginPage.tsx:36` tem `defaultValues: { email: 'teste@email.com', senha: '123456' }` desde o commit 57ff42a ("login funcionando"), e o valor está no bundle. A senha `123456` não passa na política atual, mas uma conta criada antes dela continuaria válida. Não verifiquei o banco de produção (ver perguntas).

### 3.4 AUD-04: `resultado` da adubação vem do cliente

`POST /adubacao/salvar` valida `dadosForm`, mas grava `recomendacao_json: resultado` tal como chegou no corpo (`adubacaoRoutes.ts:95,58,109`). Na sonda P2, `{ n: { dose_total_kg_ha: 99999, tipo: 'FORJADO' } }` foi gravado e devolvido. O mesmo arquivo recalcula no `PUT /:id` (`:215`) e no `/bulk` (`:143`). Só o `salvar` confia no cliente, e qualquer JSON de até 100 kB é aceito.

**Correção:** trocar `resultado` por `executarMotorAdubacao(entrada)`. O front pode continuar mandando o campo, que será ignorado.

### 3.5 AUD-05: entradas sem teto geram doses absurdas

A regra do `CLAUDE.md` é que cálculos agronômicos exigem testes com os valores esperados.

| Entrada (via API) | Validação atual | Resultado observado |
|---|---|---|
| `PRNT: 0.01` (calagem) | `prntSchema.gt(0)`; a mensagem diz "entre 1 e 100" | `NC_ajustada = 61000` t/ha (`ajustarDosePorPRNT`, `calculadoraCalagem.ts:67`) |
| `SMP: -50` | `smpSchema = z.number().finite()`, sem faixa | 200, `NC_ajustada = 26.25` (a tabela prende em 4.4 sem avisar) |
| `Al_trocavel` e `CTC_pH7` altos | sem máximo | Polinomial e saturação por bases crescem sem limite (pelo código) |
| `rendimento_esperado: 1000` (milho) | `.positive()` | N = 14.980, P₂O₅ = 15.110, K₂O = 10.030 kg/ha |
| `CTC_pH7`, `P`, `K`, `Ca`, `Mg`, `densidade_plantas` (adubação) | `.positive()` | sem teto |

O frontend limita o SMP a 4.4–7.1 (`frontend/src/schemas/calagemSchema.ts:39-41`), mas a API é pública. Além disso, quem decide `PD_COM_RESTRICAO` e calcula o pH médio 0–20 é o frontend (`api.ts:62-127`), e o backend aceita `sistema_manejo: 'PD_COM_RESTRICAO'` vindo do cliente sem conferir os critérios.

**Correção:** faixas definidas pela coordenação (ver perguntas), aplicadas no backend, com testes de limite. Levar a detecção de restrição para o motor.

### 3.6 AUD-06: `error.message` nas respostas 500

São 22 pontos:

- `analisesRoutes.ts`: 75, 129, 264, 295, 306, 342, 353, 367
- `adubacaoRoutes.ts`: 87, 119, 158, 169, 182, 198, 227, 238, 252
- `adminRoutes.ts`: 77, 126, 196, 207, 255

Na sonda P4, `GET /api/analises/nao-e-uuid` devolveu 500 com `"Failed query: select \"id\", \"usuario_id\", … where (\"analises\".\"id\" = $1 and \"analises\".\"usuario_id\" = $2) … params: nao-e-uuid,52df8c01-…"`. Isso expõe o schema completo e o id do usuário. Um id inválido deveria ser 404, e uma data inválida (`2024-02-31`) deveria ser 400.

`authRoutes.ts` já faz certo com `responderErroValidacao`; vale reaproveitar o padrão.

**Correção:** middleware de erro do Express 5 (log com `console.error`, resposta `{ erro: 'Erro interno' }`) e validação de `:id` com `z.uuid()`.

### 3.7 AUD-07: `drizzle-kit push` no boot e fluxo de migração proposto

**A hipótese estava parcialmente errada.** O `drizzle-kit` está em `dependencies` (`backend/package.json:22`, fixado em 0.31.10 no lock), não em devDependencies. O `npx` usa o binário local e **não baixa nada da internet**.

O risco que sobra é real:

- O `push` compara `src/database/schema.ts` direto com o banco e ignora `drizzle/*.sql` e o `_journal`. Os SQL de backfill nunca rodam.
- Quando a diferença é destrutiva (como o `DROP COLUMN cpf` da 0005), o push abre uma pergunta interativa, e o container não tem TTY. O comportamento nesse caso é **suspeita**: pode travar ou falhar.
- O script não tem `set -e`, então se o push falhar o servidor sobe mesmo assim.
- O `node` não é chamado com `exec`: o SIGTERM não chega ao processo e o desligamento leva SIGKILL.
- O comentário das linhas 3-6 diz que o script espera o banco, e não espera.
- Isso contraria o próprio `CLAUDE.md`, que proíbe `db:push` em banco real.

**Fluxo seguro proposto:**

1. **Backup antes de tudo** (resolve também AUD-08): `pg_dump -Fc` com cópia para fora do servidor.
2. **Baseline:** o banco de produção foi criado por push e não tem a tabela `drizzle.__drizzle_migrations`.
   - Num clone do dump, rodar `drizzle-kit migrate` num banco vazio e comparar o schema com o de produção (`pg_dump --schema-only` dos dois).
   - Se baterem, inserir em produção as 7 linhas de 0000 a 0006 em `__drizzle_migrations` (hash e `created_at` do `_journal`), para marcá-las como aplicadas.
3. **Runtime sem drizzle-kit:** no start, um `dist/migrar.js` chama `migrate(db, { migrationsFolder: './drizzle' })` de `drizzle-orm/node-postgres/migrator`. O `drizzle-kit` volta para devDependencies, e `src/` e `drizzle.config.ts` deixam de ir para a imagem.
4. **`entrypoint.sh`:** `set -e`, `node dist/migrar.js`, depois `exec node dist/server.js`. O compose ganha `healthcheck` com `pg_isready` e `depends_on: condition: service_healthy`.
5. **Toda mudança de schema** passa a ser `npm run db:generate`, com o SQL revisado no PR.

### 3.8 AUD-11 e AUD-12: Monitoramento Regional

Os dois achados se somam: os dados do painel público podem ser inventados por qualquer anônimo (AUD-11) e a parte que deveria vir do campo nunca é gravada (AUD-12).

**AUD-11:**
- `POST /analises/calcular` é público, com rate limit de 100 por 15 min por IP, e grava **todo** cálculo (`analisesRoutes.ts:41-56`). Recalcular o mesmo laudo cinco vezes conta cinco vezes.
- `GET /regional-stats` agrega todos os registros, inclusive os arquivados, e lista toda cidade que tenha pelo menos 1 registro.
- Pelo `/analises/bulk` (logado) entra qualquer `uf`/`cidade` (sonda P7).

**AUD-12 (hipótese 10 confirmada):**
- `sanitizarPayloadCalagem` (`frontend/src/services/api.ts:62-127`) nunca põe `monitoramento` no payload. Só manda `Al_sat_10_20`/`SMP_10_20` quando há restrição.
- Por isso `colunasAnalise` grava `null` em `monitoramento_pH_agua_10_20`, `monitoramento_Al_sat_10_20` e nos três indicadores (`analises.ts:50-54`). Só `monitoramento_ativo` é gravado.
- Na inserção rápida o efeito é pior: `monitoramento_ativo: !!amostra.monitoramento` fica sempre `false`.
- Consequência: os três contadores de "Problemas de monitoramento" do painel público (`analisesRoutes.ts:183-190`) ficam sempre em 0 para dados vindos da calculadora.
- Detalhes a mais: com restrição, o `pH_agua` gravado é a média 0–20, não o 0–10, e `PD_COM_RESTRICAO` vira `PD_CONSOLIDADO` no banco.

---

## 4. Dependências, imagens e ferramentas (Parte 1)

### 4.1 Versões instaladas (lockfiles)

O `node_modules` local bate com os locks: backend 561 pacotes e frontend 315, sem nenhuma divergência.

**Backend, produção:**

| Pacote | Versão |
|---|---|
| express | 5.2.1 |
| jsonwebtoken | 9.0.3 (jws 4.0.1) |
| bcrypt | 6.0.0 |
| pg | 8.20.0 |
| drizzle-orm | 0.45.2 |
| drizzle-kit | 0.31.10 |
| zod | 4.3.6 |
| express-rate-limit | 8.6.2 (ip-address 10.5.0) |
| cors | 2.8.6 |
| dotenv | 17.4.2 |

Transitivas do backend: body-parser 2.2.2, proxy-addr 2.0.7, qs 6.15.1, path-to-regexp 8.4.2, esbuild 0.18.20, 0.25.12 e 0.27.7 (via drizzle-kit/tsx).

**Backend, desenvolvimento:** typescript 6.0.3, ts-node-dev 2.0.0, jest 30.3.0, ts-jest 29.4.9, @types/node 25.6.0.

**Frontend, produção:** react/react-dom 19.2.5, react-router(-dom) 7.14.1, axios 1.16.0, jspdf 4.2.1, jspdf-autotable 5.0.7, recharts 3.8.1, react-hook-form 7.72.1, zod 4.3.6, tailwindcss 4.2.2, vite 8.0.8 (marcado como prod por ser peer de `@tailwindcss/vite`), cors 2.8.6. Transitivas: dompurify 3.4.0.

**Frontend, desenvolvimento:** vitest 4.1.4, @playwright/test 1.62.1, eslint 9.39.4.

**Imagens:**
- `node:20-alpine` (builds e backend)
- `nginx:alpine` (flutuante; hoje 1.31.8)
- `postgres:15-alpine`
- `certbot/certbot` (sem tag, ou seja `latest`)
- `pdros1812/ibiferti-{backend,frontend}:latest`, públicas no Docker Hub, só com a tag `latest`

**Actions do CI:** `actions/checkout@v4`, `actions/setup-node@v4` (Node 20), `actions/upload-artifact@v4`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/build-push-action@v5`. Todas por tag, nenhuma por SHA.

### 4.2 `npm audit` (31/10/2026)

| Escopo | low | moderate | high | critical | total |
|---|---|---|---|---|---|
| backend, tudo | 4 | 29 | 11 | 2 | 46 |
| backend, `--omit=dev` | 0 | 9 | 8 | 1 | 18 |
| frontend, tudo | 1 | 16 | 14 | 0 | 31 |
| frontend, `--omit=dev` | 0 | 1 | 11 | 0 | 12 |

### 4.3 Achados: vulnerabilidade, uso no código, risco real e correção

| Pacote@versão | Advisory | Parte afetada | Usado aqui? | Risco real | Correção |
|---|---|---|---|---|---|
| proxy-addr@2.0.7 (via express) | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), crítica | `trust proxy` com sub-rede IPv6 de bits iniciais zero casa com IPv4 | `server.ts:20` com `'loopback, linklocal, uniquelocal'` | **Baixo.** Testei `proxyaddr.compile([...])`: 203.0.113.7, 8.8.8.8 e ::ffff:8.8.8.8 dão `false`. Só seria explorável com `TRUST_PROXY` customizado | express 5.3.0 (proxy-addr 2.0.8) |
| body-parser@2.2.2 (via express) | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), alta; GHSA-v422-hmwv-36x6, baixa | Corpo comprimido com bytes extras (DoS), nas opções padrão | `express.json()` padrão, `server.ts:29` | **Médio:** DoS anônimo na API | express 5.3.0 (body-parser ≥ 2.4.0) ou `inflate:false` |
| zod@4.3.6 (back e front) | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), alta | `$ZodArray` acumula issues sem limite | Nenhum `z.array(` no backend; corpo limitado a 100 kB | Baixo (vira relevante quando o lote ganhar schema, ver AUD-18) | zod 4.6.7 |
| ip-address@10.5.0 (via express-rate-limit) | GHSA-rpw4-54j3-4h4q e mais 4, moderadas | Parse de `Address6` usado pelo `ipKeyGenerator` | Sim, em todo request IPv6 | Baixo | express-rate-limit 8.7.2 (ip-address ≥ 10.7.4) |
| qs@6.15.1 | GHSA-q8mj-m7cp-5q26 e mais 3, moderadas | `stringify`, colchetes e vírgulas | O query parser "simple" do Express 5 não usa qs; não há `urlencoded` | Baixo | express 5.3.0 |
| Bloco Prisma (prisma 7.8.0, hono 4.12.18, mysql2 3.15.3, fast-uri, valibot) | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) e outros | Peers opcionais do drizzle-orm, restos da migração Prisma → Drizzle | Nenhum import | Superfície e install scripts no build da imagem | Regenerar o lock sem eles |
| esbuild 0.18.20 / 0.27.7 (via drizzle-kit) | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | Dev server `serve` | Não | Nenhum | Sai junto com o drizzle-kit (AUD-07) |
| react-router@7.14.1 | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) (open redirect com barra invertida); [GHSA-49rj-9fvp-4h2h](https://github.com/advisories/GHSA-49rj-9fvp-4h2h) (só Framework Mode) | `navigate()`/`<Link>` com caminho do atacante | `navigate(from)` com `location.state` e `destino` do sessionStorage, ambos gerados pelo app | Baixo (o frontend verificou que não há entrada externa) | 7.18.x |
| axios@1.16.0 | ~20 advisories (GHSA-mghh-pgcx-3jjj etc.) | Adapter HTTP do Node, proxy, `toFormData`, gadgets de prototype pollution | Só no browser, `baseURL '/api'` | Baixo | 1.21.0 |
| dompurify@3.4.0 (via jspdf) | 13 advisories (GHSA-mrv2-3pqr-j5jr etc.) | `doc.html()` | Não: os PDFs usam `text` e `autoTable` | Nenhum | Atualizar o lock (≥ 3.4.17) |
| vite@8.0.8 | [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) e outros | Dev server exposto | `server.host: true` e porta 5173 publicada no compose de dev | Só em dev (AUD-33) | 8.3.x |
| handlebars (via jest), crítica, dev | GHSA-8r5x-fm3f-whwj | Templates | O jest nem roda | Nenhum | Remover jest/ts-jest (AUD-29) |

**Sem advisory para a versão exata** (OSV.dev e npm audit): express 5.2.1 (só as dependências acima), jsonwebtoken 9.0.3, bcrypt 6.0.0, pg 8.20.0, drizzle-orm 0.45.2, drizzle-kit 0.31.10, express-rate-limit 8.6.2, jspdf 4.2.1, jspdf-autotable 5.0.7 e recharts 3.8.1.

- drizzle-orm 0.45.2 já corrige [GHSA-gpj5-g38j-94v9](https://osv.dev/vulnerability/GHSA-gpj5-g38j-94v9). De qualquer forma, o código não usa `sql.identifier`, `sql.raw` nem `.as(`.
- Todo `sql\`\`` do código interpola com `${}`, que vira parâmetro: confirmado pela query `$1/$2` que vazou na sonda P4.
- Observação: `jwt.verify` sem `algorithms` (`authMiddleware.ts:53`) não é CVE, mas é bom fixar `HS256` (AUD-19).

**Ciclo de vida:**
- **Node 20:** EOL em **30/04/2026** pelo [schedule oficial do nodejs/Release](https://github.com/nodejs/Release/blob/main/schedule.json). Um dos subagentes citou 24/03 e estava errado; conferi no JSON. Node 22 tem suporte até 30/04/2027 e Node 24 até 30/04/2028.
- **PostgreSQL 15:** suportado até 11/11/2027, última minor 15.19 ([versioning](https://www.postgresql.org/support/versioning/)).
- **nginx:** 1.31 mainline e 1.30 stable têm suporte. Advisories recentes ([nginx.org](https://nginx.org/en/security_advisories.html)), como o CVE-2026-97629 (session tickets), afetam versões anteriores a 1.30.6/1.31.7. **Não verifiquei qual nginx roda no servidor:** a imagem é a do último build e a tag é flutuante.

**Legitimidade:** as 47 dependências diretas existem no registry, com repositório oficial e criação antiga. Os três lockfiles têm 100% de `resolved` em `registry.npmjs.org` e todas as entradas têm `integrity`. **Nenhum typosquatting nem pacote inventado.**

**Sem uso:**
- Backend: jest, ts-jest e @types/jest (o teste usa `node:test`).
- Frontend: cors e @types/cors.
- Raiz: `package.json`, lock e `node_modules` inteiros, resto de npm workspaces de 19/08 com symlink para um `packages/shared-schemas` que não existe.
- `ts-node` é usado pelo script `test` mas não é declarado.

---

## 5. Verificado e está OK (não precisa auditar de novo)

**Autenticação e sessão:**
- Cookie `httpOnly`, `secure` em produção (`NODE_ENV=production` no `Dockerfile.prod:19` e no compose), `sameSite=strict`, `path=/api`.
- Sem token no JavaScript nem no localStorage.
- CSRF mitigado pelo `strict`: `duckdns.org` está na Public Suffix List, então outros subdomínios contam como outro site.
- `JWT_SECRET` é obrigatório e sem valor padrão; em produção, menos de 32 caracteres é recusado (`env.ts`).
- O login tem tempo constante com hash fictício (`authRoutes.ts:19,88`) e mensagem genérica.
- Rate limit de login por IP e por conta, de cadastro, de exclusão, de feedback e de cálculo público.
- Com IPv4 e a cadeia atual nginx → Express, o XFF forjado é ignorado (sonda P10).
- `verificarRole(['ADMIN'])` aplicado no router inteiro de admin (`adminRoutes.ts:11`). Todas as rotas admin usadas pelo front passam por ele.

**Autorização por id:**
- Os GET/PUT/DELETE/PATCH de `/analises/:id` e `/adubacao/:id` filtram por `usuario_id` (`doUsuario`).
- Fazendas e talhões: CRUD com checagem de dono (`getFazendaPorIdEUsuario`, `getTalhaoById` com join). Os IDOR descritos em `docs/01-auth-e-dados.md` §5.2 e §5.3 **já foram corrigidos**.
- `/analises/:id/salvar` confere o talhão e só vincula registro sem dono com menos de 24 h.
- Exclusão de conta: senha, transação, ADMIN bloqueado.

**SQL:**
- Todo `sql\`\`` é parametrizado.
- Não há `sql.raw`, `sql.identifier` nem `.as(`.
- Os `inArray` recebem listas ou subqueries do próprio código.

**Frontend:**
- Nenhum `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `window.open` nem `href` dinâmico.
- Os PDFs usam só `text` e `autoTable` (sem `html()` nem links).
- Não há open redirect: `from` e `destino` são gerados pelo app.
- Não há `VITE_*` nem `define` com segredo, e não há sourcemaps no build.
- `tsc` passa em modo strict. Vitest: 81 testes passando. Nenhum `@ts-ignore`.

**Backend:**
- `npm run build` sem erros.
- `npm test`: 64 testes passando.
- `express.json()` limitado a 100 kB.

**Infra e segredos:**
- `.env`, `.env.producao` e `backend/.env` com permissão 600, ignorados, e os valores atuais não aparecem em nenhum commit nem arquivo do repo.
- A chave SSH nunca foi commitada e fica fora dos contextos de build.
- O `.dockerignore` exclui `.env*`.
- O `Dockerfile.prod` do backend é multi-stage e roda com `USER node`.
- O Postgres não é publicado em produção, e o backend só escuta em `127.0.0.1:3000`.
- HTTP redireciona para HTTPS.
- O `GITHUB_TOKEN` do repo é somente leitura por padrão, e a imagem só é publicada depois dos testes.
- As branches `audit/pre-versao-final`, `feat/alteracoes-coordenacao` e `origin/main` não contêm a linhagem antiga.

**Dependências:** nenhum pacote falso; jspdf 4.2.1 e drizzle-orm 0.45.2 já trazem as correções de segurança conhecidas.
