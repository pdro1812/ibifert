# Referência Técnica — Plataforma (Auth, Cadastro, Histórico, Admin)

> Especificação de como o resto da aplicação funciona hoje (fora dos
> motores de cálculo, já cobertos em `ref-calagem.md` e `ref-adubacao.md`).
> Achados de bug/segurança não entram aqui — ficam em `docs/01-auth-e-dados.md`,
> `docs/04-cruds-apoio.md`, `docs/05-admin.md`, `docs/06-frontend-fluxos.md`,
> com link de volta para a seção correspondente deste documento.

---

## 1. Autenticação e sessão

### 1.1 Registro (`POST /api/auth/register`)

```
RegistroSchema: nome (>=3), cpf (11 dígitos), cidade, estado (sigla 2 letras),
                email, telefone (opcional), senha (>=6)
```
Fluxo (`authRoutes.ts:22-68`):
1. Valida payload (`RegistroSchema`, zod).
2. Verifica se `email` **ou** `cpf` já existem (`OR`, uma única query) — se
   sim, `400 "E-mail ou CPF já cadastrados."` (mensagem genérica, não diz
   qual dos dois colidiu).
3. Hash da senha com `bcrypt` (custo 10).
4. Insere usuário — `role` sempre nasce `PRODUTOR` (default da coluna,
   `schema.ts:28`; não há como se auto-cadastrar como `ADMIN` pela rota
   pública).
5. Emite JWT (`{ id, role }`, expira em `7d`) e retorna `201` com
   `{ mensagem, token, usuario: { id, nome, email } }` — **nota**: a
   resposta do registro não inclui `role`, diferente da resposta do login
   (§1.2); o frontend assume `PRODUTOR` implicitamente até o próximo
   login/reload.

Rate limit: `20 requisições / 15 min` por IP, compartilhado entre
`/register` e `/login` (`limitadorAuth`, `authRoutes.ts:13-19`).

### 1.2 Login (`POST /api/auth/login`)

```
LoginSchema: email, senha (>=1)
```
Fluxo (`authRoutes.ts:71-104`):
1. Busca usuário por `email`.
2. Usuário não existe **ou** senha não bate → mesma mensagem genérica
   `401 "Credenciais inválidas."` nos dois casos (não revela qual dos
   dois falhou).
3. Emite JWT (`{ id, role }`, expira em `7d`) e retorna `200` com
   `{ token, usuario: { id, nome, email, role } }`.

### 1.3 Token e middleware (`authMiddleware.ts`)

- `verificarToken`: exige header `Authorization: Bearer <token>`. Sem
  header → `401`. Token inválido/expirado → `401`. Se válido, popula
  `req.userId` e `req.userRole` a partir do payload do JWT (não há
  consulta ao banco para confirmar que o usuário ainda existe/não foi
  removido — o token é a única fonte de verdade até expirar ou até o
  segredo mudar).
- `verificarRole(roles[])`: usado **depois** de `verificarToken` nas rotas
  que exigem uma role específica (ex.: `adminRoutes.use(verificarToken,
  verificarRole(['ADMIN']))`, `adminRoutes.ts:10`). Sem token válido +
  role permitida → `403`.
- Duração do token: **7 dias**, fixa, sem refresh token — expirado, o
  usuário precisa logar de novo (não há renovação silenciosa).

### 1.4 Frontend — `AuthContext.tsx` + `ProtectedRoute.tsx`

- Sessão vive em `localStorage`: chaves `@ibiferti:token` e
  `@ibiferti:user` (objeto `{id, nome, email, role}` serializado).
- Ao carregar a aplicação, `AuthContext` lê o `localStorage` uma vez
  (`useEffect` em `AuthContext.tsx:46-62`) e popula `user` — **não
  valida o token com o backend nessa reidratação** (se o token expirou
  entre sessões, o app mostra o usuário como logado até a primeira
  chamada de API falhar com 401).
- `services/api.ts` (interceptor de request) injeta
  `Authorization: Bearer <token>` em toda chamada automaticamente
  (`api.ts:24-37`); o interceptor de resposta (`api.ts:39-51`) captura
  qualquer `401` de qualquer chamada, limpa o `localStorage` e força
  redirect para `/login` — esse é o mecanismo real de "logout por token
  expirado", não uma checagem proativa de expiração.
- `ProtectedRoute.tsx`: se `isLoading` (ainda lendo storage), mostra
  spinner; se não logado, redireciona para `/login` guardando a rota de
  origem (`location.state.from`, usado para voltar após login); se
  `roles` foi passado e a role do usuário não está na lista, redireciona
  para `/` (não para uma página de "acesso negado").

## 2. Cadastro

### 2.1 Cadastro de usuário (`RegisterPage.tsx`)

- Formulário com `react-hook-form` + `zod` (schema local — mesmos campos
  do `RegistroSchema` do backend, ver duplicação de schemas já registrada
  em achados anteriores).
- CPF é enviado ao backend **sem pontuação** (`data.cpf.replace(/\D/g,
  '')`) — a validação do backend (`length(11)`) depende dessa limpeza
  prévia no client; um CPF formatado (`123.456.789-00`) chegaria com 14
  caracteres e falharia na validação do backend.
- Ao dar certo, chama `cadastrar()` do `AuthContext` — que já loga o
  usuário automaticamente (backend retorna token no próprio `/register`,
  §1.1) e redireciona para `location.state.from` ou `/dashboard`.
- **Interação com cálculo feito como convidado**: se o usuário calculou
  uma calagem/adubação sem estar logado e clicou em "salvar", os dados
  ficam em `sessionStorage` (`analisePendente` / `adubacaoPendente`) até
  o registro/login ser concluído — ver §3.4.

### 2.2 Cadastro de fazendas e talhões (`FazendasPage.tsx`)

Modelo: `Fazenda 1—N Talhão`. Ambas as tabelas (`fazendas`, `talhoes`)
usam `usuario_id`/`fazenda_id` como **colunas soltas, sem FK real no
schema Drizzle** (comentário no próprio `schema.ts:112,122`: "FK
lógica") — a relação é garantida só pelo código da aplicação, não pelo
banco.

Rotas (`fazendasRoutes.ts`, todas atrás de `verificarToken`):
| Rota | O que faz |
|---|---|
| `GET /api/fazendas` | lista fazendas do usuário logado, cada uma já com seus talhões aninhados e a **última análise de calagem de cada talhão** (`ultimaAnalise`, usada nos cards da tela) |
| `POST /api/fazendas` | cria fazenda (`nome`, `municipio`, `uf`) vinculada ao `usuario_id` do token |
| `DELETE /api/fazendas/:id` | remove fazenda **e seus talhões em cascata** (`deleteFazenda` apaga talhões primeiro) — só se a fazenda pertencer ao usuário do token |
| `POST /api/fazendas/:fazendaId/talhoes` | cria talhão — checa antes que a fazenda seja do usuário logado |
| `DELETE /api/fazendas/talhoes/:id` | remove talhão — checa dono via `getTalhaoById` (que já faz `INNER JOIN` com `fazendas` filtrando por `usuario_id`) |
| `GET /api/fazendas/talhoes/:id` | detalhe de um talhão — mesma checagem de dono |
| `GET /api/fazendas/talhoes/:id/analises` | histórico de calagem daquele talhão especificamente (não inclui adubação, ver §3.3) |

`municipio`/`uf` vêm de `services/ibge.ts`, que consome a API pública do
IBGE (`servicodados.ibge.gov.br`) filtrando só `RS`/`SC` na lista de
estados — é usado só para preencher os selects do formulário, não afeta
nenhum cálculo agronômico.

## 3. Histórico de análises

### 3.1 Listagem unificada (`GET /api/analises/historico`)

Usada pelo `HistoricoAnalisesPage.tsx` — junta calagem (`analises`) e
adubação (`analisesAdubacao`) num único array, cada item marcado
`tipo: 'CALAGEM' | 'ADUBACAO'`, ordenado por `criado_em` desc
(`analisesRoutes.ts:212-241`). Comportamento por role:
- `PRODUTOR`: só vê os próprios (`WHERE usuario_id = req.userId` nas
  duas tabelas).
- `ADMIN`: vê de todos os usuários (`undefined` no filtro) — mas essa
  rota **não é a que o admin usa na prática**; o menu do admin usa
  `/admin/analises` (§4.2), que já vem com nome/e-mail do dono
  aninhado. `/analises/historico` sem filtro por admin existe mas não
  parece ter consumidor no frontend atual (checar se ainda é usado por
  algum lugar antes de considerar código morto).

### 3.2 Detalhe por talhão (`TalhaoDetalhesPage.tsx`)

Usa `getTalhao(id)` + `getAnalisesByTalhao(id)`
(`GET /api/fazendas/talhoes/:id/analises`) — mostra só o histórico de
**calagem** daquele talhão específico (a rota de talhão não agrega
adubação, diferente do histórico geral da §3.1).

### 3.3 Inserção rápida / lote (`NovaAnalisePage.tsx`)

Interface de planilha (uma linha por amostra) para lançar várias análises
de uma vez, para os talhões de uma fazenda. Suporta três modos (`CALAGEM`,
`ADUBACAO` e, desde 2026-10-05, `AMBOS` — padrão ao abrir a tela): em
`AMBOS` as colunas compartilhadas (pH, MO, CTC) aparecem uma vez só, seguidas
das colunas de calagem e de adubação, e cada linha é validada contra os dois
schemas. Há ainda o checkbox global "Calcular também o Polinomial" (modos com
calagem; ver item 5 do registro). Habilita/desabilita células conforme o modo
e os campos preenchidos (`isCellEnabled`). Envia para:
- `POST /api/analises/bulk` (calagem) — exige token, valida cada amostra
  com `CalagemSchema` e roda `executarMotorCalagem` por linha antes de
  persistir em lote (`salvarLoteAnalises`).
- `POST /api/adubacao/bulk` (adubação) — exige token, mesma ideia, mas
  processa **uma amostra por vez em loop** (não é uma transação única —
  se a amostra 3 de 10 falhar na validação, as 1 e 2 já foram
  persistidas e o array de resultado marca só a 3 como `sucesso: false`;
  não há rollback do lote).

No modo `AMBOS` os dois bulks são enviados em paralelo e **gravam registros
independentes** (uma linha em `analises` e outra em `analises_adubacao`, sem
vínculo entre si além do talhão e da identificação). O frontend confere
`resultados[].sucesso` do bulk de adubação (que responde 200 mesmo com falhas
individuais) e, numa falha parcial, mostra o resumo por módulo e reenvia
apenas as linhas que ainda não foram salvas, para não duplicar registros.

### 3.4 Cálculo avulso (guest) + recuperação pós-login

`POST /api/analises/calcular` e `POST /api/adubacao/calcular` **não
exigem token** — qualquer visitante pode calcular uma recomendação sem
estar logado (o motor em si é público; só *salvar vinculado a uma conta*
exige login). Para calagem, mesmo sem token o backend tenta decodificar
um JWT se vier um header `Authorization` (bloco `try/catch` silencioso em
`analisesRoutes.ts:25-33`) — se vier um token válido, associa
`usuario_id`; se não vier ou for inválido, salva como "convidado"
(`usuario_id: null`, contado à parte nas estatísticas do admin, §4.1).

Se o visitante calcula **sem** estar logado e depois decide criar
conta/logar: o resultado calculado fica em `sessionStorage`
(`analisePendente` para calagem, `adubacaoPendente` para adubação —
gravado pelas páginas `CalculadoraPage`/`AdubacaoPage`, não mostrado
neste documento em detalhe) e `recuperarAnalisePendente()`
(`services/pendencias.ts`) é chamado logo após login/registro bem-sucedido
para recalcular e (no caso de adubação) persistir a análise já vinculada
à conta nova, em vez de descartar o que o visitante já tinha preenchido.
Note a assimetria: para calagem, a função só **recalcula** (o salvamento
já aconteceu no `POST /calcular` original, possivelmente como
"convidado" — não haveria uma segunda gravação vinculada à conta a menos
que o usuário refaça o cálculo); para adubação, a função recalcula **e**
chama `salvarAdubacao` explicitamente. Comportamento não é simétrico
entre os dois fluxos.

### 3.5 Geração de PDF (`pdfGenerator.ts` / `pdfGeneratorAdubacao.ts`)

Gerado **inteiramente no navegador** (`jsPDF` + `jspdf-autotable`), a
partir dos dados que já estão na tela (`dadosEntrada` + `resultado`) —
não há chamada ao backend para montar o PDF. Como o dado já pertence à
análise que o usuário está vendo (a própria análise dele, ou uma que o
admin já carregou via rota protegida), não há PDF sendo montado com dado
de terceiros a que o usuário não deveria ter acesso — a superfície de
risco aqui é a mesma da tela que já exibe os dados, não uma exposição
nova.

## 4. Painel Admin

Todas as rotas abaixo exigem `verificarToken` + `verificarRole(['ADMIN'])`
(`adminRoutes.use(...)`, aplicado uma vez para o router inteiro).

### 4.1 Visão geral (`AdminDashboardPage.tsx` → `GET /api/admin/stats`)

Retorna, numa única chamada: total de usuários + 5 mais recentes; total
de análises de calagem (subdividido em logadas vs. convidado — ver
§3.4); total de análises de adubação; distribuição de calagem por UF e
por sistema de manejo. Tudo calculado via agregação SQL (`count`,
`groupBy`) no momento da requisição — não há cache/snapshot, cada
carregamento da tela recalcula do zero.

### 4.2 Análises de todos os usuários (`AdminAnalisesPage.tsx` → `GET /api/admin/analises`)

Junta calagem + adubação de **todos** os usuários (`LEFT JOIN` com
`users` para trazer `usuario_nome`/`usuario_email` de quem fez cada
análise, incluindo convidados — que aparecem com nome/email nulos via
`LEFT JOIN`). É o equivalente admin do histórico da §3.1, mas já vem com
autoria de cada registro.

### 4.3 Gestão de usuários (`AdminUsersPage.tsx`)

- `GET /api/admin/users` — lista todos os usuários com contagem de
  análises (calagem + adubação) por usuário, calculada com duas queries
  agregadas separadas e depois unidas em memória via `Map` (não é um
  único `JOIN`/`GROUP BY`).
- `GET /api/admin/users/:id/full-details` — ao clicar em um usuário
  específico: busca **todas** as fazendas, talhões e análises (calagem +
  adubação) daquele usuário, sem paginação (`orderBy` só, sem `limit`) —
  para uma conta com histórico muito grande, a resposta cresce sem teto.
- Não há rota de **editar ou remover** um usuário nesta API atualmente —
  a tela é só de consulta (confirmar se isso é intencional ou uma
  lacuna de produto).

### 4.4 Monitoramento regional (`MonitoramentoPage.tsx`)

Diferente das outras 3 páginas admin, **esta página é pública** (fica em
`PublicLayout`, rota `/monitoramento` fora de qualquer `ProtectedRoute`
— ver `App.tsx:36`). Consome `GET /api/analises/regional-stats`
(`analisesRoutes.ts:117-209`), que também não exige token — médias de pH
e dose de calcário, distribuição por sistema de manejo, e contagem de
alertas de monitoramento (compactação, P baixo, produtividade baixa),
filtráveis por UF/cidade, com um agrupamento especial `ALTO_JACUI` (lista
fixa de 8 municípios do RS, hardcoded na rota). Como os dados são
agregados (médias/contagens), não expõe análise individual de nenhum
usuário.

### 4.5 O que o front esconde vs. o que o back bloqueia

- **Menu**: `DashboardLayout.tsx` escolhe `ADMIN_SIDEBAR_ITEMS` ou
  `PRODUTOR_SIDEBAR_ITEMS` conforme `user.role` (`isAdmin = user?.role
  === 'ADMIN'`) — um `PRODUTOR` nunca vê os links de admin no menu.
- **Rota**: `App.tsx` já separa as rotas `/admin/*` num bloco
  `<ProtectedRoute roles={['ADMIN']}>` próprio (`App.tsx:57-63`) — um
  `PRODUTOR` autenticado que tentasse acessar `/admin` diretamente pela
  URL é redirecionado para `/` pelo próprio `ProtectedRoute` (§1.4),
  antes mesmo de a página tentar chamar a API.
- **API**: todas as rotas de `adminRoutes.ts` exigem `verificarRole(['ADMIN'])`
  no backend, independente do front — a proteção não depende só de
  esconder o botão/rota no cliente.

## 5. Navegação geral do frontend

### 5.1 Estrutura de rotas (`App.tsx`)

| Grupo | Layout | Rotas |
|---|---|---|
| Público | `PublicLayout` | `/` (Calculadora/Calagem), `/adubacao`, `/monitoramento`, `/validacao`, `/login`, `/RegisterPage` |
| Protegido (qualquer usuário logado) | `DashboardLayout` | `/dashboard` (Fazendas), `/dashboard/talhao/:id`, `/dashboard/nova-analise` |
| Protegido (só `PRODUTOR`) | `DashboardLayout` | `/historico` |
| Protegido (só `ADMIN`) | `DashboardLayout` | `/admin`, `/admin/usuarios`, `/admin/analises` |
| Fallback | — | qualquer rota não mapeada → redireciona para `/` |

Duas observações pontuais:
- A rota de cadastro é literalmente `/RegisterPage` (não `/register` ou
  `/cadastro`) — inconsistente com o padrão kebab/lowercase das demais
  rotas, mas funcional (o link do `Navbar.tsx:82` aponta para o mesmo
  path).
- `/historico` é exclusivo de `PRODUTOR` por design — o comentário no
  próprio código (`App.tsx:49`) explica que o admin usa
  `/admin/analises` como equivalente.

### 5.2 Layouts

- `PublicLayout`: `Navbar` + conteúdo centralizado — usado nas páginas
  de cálculo (acessíveis sem login) e nas páginas de auth.
- `DashboardLayout`: `Navbar` + sidebar lateral (itens variam por role,
  §4.5) + área de conteúdo — usado em todas as páginas que exigem login.

### 5.3 `services/api.ts` — cliente HTTP central

- Instância única do `axios` (`baseURL: '/api'`, timeout `10s`).
- Interceptor de request injeta o JWT do `localStorage` em toda chamada
  (§1.4).
- Interceptor de resposta trata `401` globalmente (limpa sessão,
  redireciona para `/login`) — nenhuma página precisa tratar "sessão
  expirada" individualmente.
- Concentra também `sanitizarPayloadCalagem()` — função que transforma o
  `EntradaCalagem` do formulário no payload exato que a API espera,
  incluindo a decisão de promover `sistema_manejo` para
  `PD_COM_RESTRICAO` no cliente quando `detectarRestricaoMonitoramento()`
  indica isso (replica no frontend a mesma lógica de
  `avaliarMonitoramento10_20()` do backend, descrita em
  `ref-calagem.md §5` — duas implementações da mesma decisão, front e
  back, candidato a mantê-las sincronizadas manualmente se uma mudar).

## 6. Como usar este documento para investigar um problema

1. **"Usuário não vê um talhão/fazenda que deveria"** → confira a
   checagem de dono em §2.2 (todas as rotas de fazenda/talhão filtram
   por `usuario_id` do token) — provavelmente o registro pertence a
   outra conta, ou foi criado como convidado (`usuario_id: null`) e
   nunca associado.
2. **"Admin não vê algo esperado no dashboard"** → confirme qual das 3
   rotas admin (§4.1/4.2/4.3) alimenta o card em questão; elas calculam
   agregações independentes, não compartilham uma única query.
3. **"Sessão caiu sozinha"** → não é uma checagem proativa de expiração;
   só acontece quando alguma chamada de API retorna `401` (§1.4) — o
   token JWT dura exatamente 7 dias (§1.3) a partir da emissão (login ou
   registro), sem renovação.
4. **"Calculei sem estar logado e não salvou vinculado à minha conta
   depois que criei o login"** → ver o comportamento assimétrico
   documentado em §3.4 entre calagem (só recalcula) e adubação (recalcula
   e salva).
5. **"CPF/e-mail duplicado dá erro genérico"** → é intencional (§1.1) —
   a mensagem não diferencia qual dos dois campos colidiu.
