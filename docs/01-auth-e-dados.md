# Etapa 1 — Auth, Banco de Dados e Roteamento

Escopo lido por completo: `backend/src/database/*`, `backend/src/middlewares/
authMiddleware.ts`, `backend/src/routes/authRoutes.ts`,
`backend/src/routes/adminRoutes.ts`, `backend/src/routes/adubacaoRoutes.ts`,
`backend/src/routes/analisesRoutes.ts`, `backend/src/routes/fazendasRoutes.ts`,
`backend/src/routes/standaloneRoutes.ts`, `backend/src/schemas/authSchema.ts`,
`backend/src/server.ts`, `frontend/src/contexts/AuthContext.tsx`,
`frontend/src/components/ProtectedRoute.tsx`, `frontend/src/services/api.ts`.

> Nenhum código foi alterado nesta etapa (fase de leitura). Achados de
> segurança/bugs estão listados no fim, por severidade, para correção
> posterior em branches isoladas — conforme combinado no
> [PLANO_DOCUMENTACAO.md](../PLANO_DOCUMENTACAO.md).

---

## 1. Schema do banco (`database/schema.ts`)

Drizzle + Postgres. Tabelas:

| Tabela | Chave | Descrição |
|---|---|---|
| `users` | `id` uuid | Conta do usuário: `nome`, `email` (único), `senha` (hash bcrypt), `cidade`, `estado`, `telefone?`, `role` (`ADMIN`\|`PRODUTOR`, default `PRODUTOR`), `createdAt`. |
| `fazendas` | `id` uuid | `usuario_id` (FK **lógica**, não há `references()` no schema), `nome`, `municipio`, `uf`. |
| `talhoes` | `id` uuid | `fazenda_id` (FK lógica), `nome`, `cultura`. |
| `analises` | `id` uuid | Resultado de **calagem**: dados de entrada da amostra de solo (`pH_agua`, `SMP`, `Al_trocavel`, `CTC_pH7`, `V_atual`, monitoramento 10-20cm) + resultado calculado (`NC_base/final/ajustada/vb`, `metodo_calc_roteado` — sempre `SMP` desde 2026-10-02, `alertas[]`; o `NC_polinomial` complementar **não** é persistido). `usuario_id`/`talhao_id` opcionais (permite análise "convidado", sem login). |
| `analisesAdubacao` | `id` uuid | Resultado de **adubação**: dados de solo (Grupo A: argila, MO, CTC, P, K, Ca, Mg, micros) + cultura/manejo (Grupo B) + `recomendacao_json` (resultado bruto do motor, como JSONB). `usuario_id`/`talhao_id` opcionais. |

**Observações de modelagem:**
- Nenhuma FK real (`references()`) entre `analises.usuario_id → users.id`,
  `fazendas.usuario_id → users.id`, `talhoes.fazenda_id → fazendas.id`, etc.
  São só `uuid` soltos, comentados como FK lógica. Isso significa que o
  banco **não impede** um registro órfão (ex.: fazenda apontando pra um
  `usuario_id` que não existe) nem cascata de exclusão — se um usuário for
  deletado, fazendas/talhões/análises dele ficam soltos no banco.
- `recomendacao_json` guarda o resultado inteiro da adubação como JSON — ou
  seja, a "verdade" do que foi recomendado pro produtor fica congelada ali;
  se a fórmula do motor mudar depois, análises antigas não são recalculadas
  (o que é o comportamento correto para um histórico, só documentando).

---

## 2. Fluxo de autenticação

**Registro** (`POST /api/auth/register`):
1. Valida payload com `RegistroSchema` (zod): nome ≥3, estado com 2
   letras, email, senha ≥6 caracteres.
2. Confere se `email` já existe — bloqueia duplicata.
3. Hash da senha com `bcrypt.hash(senha, 10)`.
4. Insere no banco, role default `PRODUTOR`.
5. Assina JWT `{ id, role }`, expira em `7d`.
6. Responde com token + dados básicos do usuário (login automático).

**Login** (`POST /api/auth/login`):
1. Valida com `LoginSchema`.
2. Busca por email, compara senha com `bcrypt.compare`.
3. Mesma resposta 401 genérica (`Credenciais inválidas`) tanto pra email
   inexistente quanto senha errada — bom, evita enumeração de contas.
4. Emite o mesmo JWT de 7 dias.

**Verificação** (`authMiddleware.ts`):
- `verificarToken`: lê `Authorization: Bearer <token>`, valida com
  `jwt.verify`, popula `req.userId`/`req.userRole`.
- `verificarRole(roles[])`: checa se `req.userRole` está na lista permitida.

**Frontend:**
- `AuthContext` guarda token + usuário em `localStorage`
  (`@ibiferti:token`, `@ibiferti:user`) e reidrata no load da página.
- Interceptor do axios (`api.ts`) injeta o `Authorization` header em toda
  chamada, e desloga automaticamente (limpa storage + redireciona
  `/login`) em qualquer resposta `401`.
- `ProtectedRoute` bloqueia rota se não logado, e bloqueia por `roles` se a
  role do usuário não bate — mas isso é **só UI**, a proteção real tem que
  existir no backend (ver matriz abaixo).

---

## 3. Matriz de proteção por rota

| Rota | Middleware | Observação |
|---|---|---|
| `POST /api/auth/register` | nenhum (pública, correto) | — |
| `POST /api/auth/login` | nenhum (pública, correto) | — |
| `POST /api/analises/calcular` | **nenhum**, mas decodifica JWT manualmente se vier header (opcional) | ver achado de duplicação abaixo |
| `POST /api/analises/bulk` | `verificarToken` | ok |
| `GET /api/analises/regional-stats` | nenhum (pública) | parece intencional — estatística agregada pública |
| `GET /api/analises/historico` | `verificarToken` | filtra por `req.userId`, exceto se `role === ADMIN` (vê tudo) — correto |
| `POST /api/adubacao/calcular` | nenhum (pública, correto — só calcula, não salva) | — |
| `POST /api/adubacao/salvar` | `verificarToken` | salva vinculado a `req.userId` — correto |
| `POST /api/adubacao/bulk` | `verificarToken` | ok |
| `GET /api/adubacao` (lista do usuário) | `verificarToken` | **bug funcional**, ver §5.1 |
| `GET /api/adubacao/:id` | `verificarToken` | **sem checagem de dono** — IDOR, ver §5.2 |
| `GET/POST/DELETE /api/fazendas/*` | `verificarToken` (`router.use`) | **sem checagem de dono** em `DELETE` e nos endpoints de talhão — IDOR, ver §5.3 |
| `GET/POST /api/admin/*` | `verificarToken` + `verificarRole(['ADMIN'])` | aplicado em todas via `adminRoutes.use(...)` — correto |
| `POST /api/standalone/calcular` | **nenhum** | ver §5.4 — precisa confirmar se é intencional |

---

## 4. Dados sensíveis expostos

- `adminRoutes.get('/users')` retorna `email`, `cidade`, `estado` de
  todos os usuários — correto para uma tela de admin, mas confirma que
  **qualquer erro na checagem de role vira vazamento de PII em massa**
  (motivo a mais pra tratar `verificarRole` como código crítico).
- Resposta de login/registro retorna `{ id, nome, email, role }` — não
  vaza hash de senha. Correto.
- `.env` do backend contém só `DATABASE_URL` — **não define `JWT_SECRET`**
  (ver achado crítico §5.5).

---

## 5. Achados — por severidade

### 5.1 CRÍTICO (bug funcional) — listagem de adubação sempre falha

`backend/src/routes/adubacaoRoutes.ts:166-176`:

```ts
adubacaoRoutes.get('/', verificarToken, async (req: AuthRequest, res) => {
  if (!req.user) {                         // <-- req.user nunca existe
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  const analises = await listarAnalisesAdubacaoPorUsuario(req.user.id);
  ...
```

`verificarToken` só popula `req.userId` e `req.userRole` (ver
`authMiddleware.ts:22-23`), nunca `req.user`. Logo `req.user` é sempre
`undefined`, a condição `!req.user` é sempre verdadeira, e o endpoint
**sempre responde 401**, mesmo com token válido. Na prática: a tela de
histórico de adubação do usuário logado nunca deveria funcionar hoje —
vale confirmar em teste manual se o frontend usa esse endpoint ou se
contorna via `/api/analises/historico` (que também traz adubação e usa
`req.userId` corretamente).

**Correção proposta (não aplicada agora):** trocar `req.user.id` por
`req.userId`, igual ao resto do arquivo.

### 5.2 ALTO (IDOR) — qualquer usuário logado lê análise de adubação de outro

`GET /api/adubacao/:id` → `buscarAnaliseAdubacaoPorId(id)`
(`backend/src/database/adubacao.ts:13-20`) busca só por `id`, sem cruzar
com `usuario_id` do token. Qualquer usuário autenticado que souber (ou
adivinhar/enumerar) o UUID de uma análise de outro usuário consegue ler o
solo e a recomendação completa dele.

### 5.3 ALTO (IDOR) — fazendas e talhões sem checagem de dono

`backend/src/routes/fazendasRoutes.ts`:
- `DELETE /:id` (fazenda) — deleta por id, sem checar `usuario_id`.
- `POST /:fazendaId/talhoes` — cria talhão em qualquer `fazendaId`, sem
  checar se a fazenda pertence a quem está logado.
- `DELETE /talhoes/:id` — deleta qualquer talhão.
- `GET /talhoes/:id` e `GET /talhoes/:id/analises` — lê dados de
  qualquer talhão de qualquer usuário.

O único endpoint dessa rota que respeita dono é o `GET /` (lista fazendas
via `getFazendasByUsuario(usuarioId)`). Todos os outros dependem só de
"estar logado", não de "ser o dono". Isso é IDOR clássico: qualquer conta
válida pode ler/apagar dados de fazenda de qualquer outro produtor.

*(Aprofundamento completo desses três pontos fica pra Etapa 4, que também
cobre `analises`/`fazendas` no lado do banco — aqui já registro porque
apareceu direto na leitura do middleware de auth.)*

### 5.4 MÉDIO/A CONFIRMAR — `standaloneRoutes` totalmente pública

`POST /api/standalone/calcular` não tem `verificarToken` nem qualquer
validação de schema (usa `req.body` direto, desestruturado, sem zod). Ela
expõe as mesmas fórmulas de calagem em formato "cru" (`motorStandalone.ts`).
Não é necessariamente uma falha — pode ser proposital (calculadora pública
para uso externo/embed) — mas duas coisas valem checagem antes da Etapa 3:
1. **Sem validação de input**: `ph_0_20`, `smp_0_20` etc. vêm sem checagem
   de tipo/faixa — `NaN`/`undefined` passam direto pro motor de cálculo.
2. Não há rate limit — se é uma API pública, é alvo fácil de abuso
   (chamadas em massa sem custo de autenticação).

### 5.5 CRÍTICO — segredo JWT com fallback hardcoded, e em uso agora

`authMiddleware.ts:21`, `authRoutes.ts:10`, `analisesRoutes.ts:28` — todos
usam `process.env.JWT_SECRET || 'super-secret-key'`. Conferido: o
`backend/.env` real do projeto **só define `DATABASE_URL`**, não define
`JWT_SECRET` — ou seja, a string `'super-secret-key'` não é um exemplo
morto, é **o segredo efetivamente usado em produção/dev agora**. Qualquer
pessoa com acesso ao código-fonte (que já está num repo git, ver 5.6)
consegue forjar um token válido com `role: 'ADMIN'` para qualquer `id`.

**Correção proposta (não aplicada agora):** gerar um `JWT_SECRET` forte,
colocar no `.env`, e remover o fallback hardcoded (falhar explicitamente
se a env var não existir, em vez de cair num valor público conhecido).

### 5.6 CRÍTICO — `.env` com credenciais está commitado no git

```
$ git ls-files | grep env
backend/.env
$ git show HEAD:backend/.env
DATABASE_URL="postgresql://admin:adminpassword@db:5432/ibifertydb"
```

O arquivo está listado no `.gitignore` (`# Keep environment variables out
of version control` / `.env`), mas já tinha sido adicionado ao repositório
antes da regra existir (ou a regra foi ignorada), e o commit
`084b514 fix: sync docker config and add auto-migrations` trouxe o
conteúdo atual. `.gitignore` só impede *novos* `git add`, não remove o
que já está rastreado.

Como você confirmou que os dados atuais não têm valor a preservar, o
risco imediato de "vazamento de dado real" é baixo — mas a credencial
(`admin`/`adminpassword`) e o padrão de expor `.env` no histórico do git
continuam sendo o problema, porque:
- Fica no **histórico** mesmo depois de remover o arquivo do commit atual
  (precisa reescrever histórico ou trocar a credencial, não só apagar).
- Se esse repo for empurrado pra um remoto (GitHub etc.) hoje, a
  credencial vai junto.

**Correção proposta (não aplicada agora, e não vou rodar sozinho):**
1. Trocar a senha do Postgres (e o `JWT_SECRET`) para valores novos — os
   atuais devem ser considerados publicamente conhecidos a partir de agora.
2. `git rm --cached backend/.env` no commit atual + confirmar que
   `.gitignore` cobre daqui pra frente.
3. Decidir com você se vale reescrever o histórico do git (remove o rastro
   antigo, mas reescreve hashes de commit — ação que só farei com
   aprovação explícita, é destrutiva por natureza).

### 5.7 BAIXO — duplicação/decodificação manual de JWT

`analisesRoutes.ts:26-30` reimplementa a leitura/verificação de token na
mão (`require('jsonwebtoken')` inline, dentro da rota) em vez de usar
`verificarToken` como middleware opcional. Funciona, mas duplica lógica
que já existe em `authMiddleware.ts` — se o segredo ou o formato do token
mudar, é fácil esquecer de atualizar os dois lugares. Candidato a
pequena limpeza (extrair um `verificarTokenOpcional` reutilizável) — sem
urgência, não é uma falha de segurança por si só.

### 5.8 BAIXO — CORS totalmente aberto

`server.ts:13` — `app.use(cors())` sem configuração aceita requisições de
qualquer origem. Como a auth é via header `Authorization` (não cookie),
não há risco de CSRF clássico, mas ainda vale restringir a origem quando
o domínio do frontend em produção for definido.

### 5.9 BAIXO — sem rate limiting em login/registro

Nenhum limite de tentativas em `POST /api/auth/login` — abre espaço para
força bruta de senha (mitigado parcialmente pelo bcrypt custo 10, mas não
impede tentativas ilimitadas).

### 5.10 Código morto / a confirmar

- Nada claramente morto nesta camada ainda. `test_insert.ts` (raiz do
  backend, fora de `src/`) não foi lido nesta etapa — fica para
  confirmação na Etapa 2/3 quando eu tocar nos motores de cálculo, já que
  provavelmente é um script manual de teste de inserção.

---

## 6. Resumo de prioridade para correção (branches separadas, após sua aprovação)

1. **5.5** — trocar `JWT_SECRET` hardcoded por variável obrigatória.
2. **5.6** — remover `.env` do rastreamento do git + trocar credenciais.
3. **5.2 / 5.3** — adicionar checagem de dono (`usuario_id`) nos endpoints
   de fazenda/talhão/adubação por id (será detalhado com todos os casos
   na Etapa 4, mas já pode virar uma branch de correção agora se preferir
   priorizar segurança antes de terminar a documentação).
4. **5.1** — corrigir `req.user` → `req.userId` (bug funcional simples).
5. Demais itens (5.4, 5.7, 5.8, 5.9) — baixa urgência, endereçar quando
   passarmos pelas etapas correspondentes.

## Próximo passo

Seguir para a **Etapa 2 — Motor de Cálculo: Calagem**
(`calculadoraCalagem.ts`, `motorCalagem.ts`, `tabelaSmp.ts`), salvo se você
quiser primeiro abrir as branches de correção dos itens críticos acima.
