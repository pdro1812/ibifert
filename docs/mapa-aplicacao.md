# Mapa da Aplicação — Ibiferti

---

## 1. Diagrama de camadas

```
[Usuário / navegador]
   │
   ▼
Frontend (React + Vite + React Router)
   │  AuthContext (sessão em localStorage) + ProtectedRoute (gate de rota)
   │  services/api.ts (axios: injeta JWT no header, trata 401 global)
   ▼
Backend (Express, porta 3000, montado sob /api)
   │  routes/*.ts  → middlewares/authMiddleware.ts (verificarToken/verificarRole)
   │              → schemas/*.ts (validação zod, rejeita 400 antes de calcular)
   ▼
services/*.ts (motores de cálculo — funções puras, sem I/O)
   │  calculadoraCalagem.ts / motorCalagem.ts / tabelaSmp.ts
   │  calculadoraAdubacao.ts / motorAdubacao.ts / tabelasAdubacaoGraos.ts
   │  motorStandalone.ts (engine paralelo, ver ref-adubacao.md aviso no topo)
   ▼
database/*.ts (Drizzle ORM) → PostgreSQL
```

Requisição típica ponta a ponta (exemplo: usuário autenticado calcula e
salva uma calagem vinculada a um talhão):

```
CalculadoraPage.tsx (form)
  → services/api.ts::calcularCalagem()          [injeta JWT automaticamente]
  → POST /api/analises/calcular                  (analisesRoutes.ts)
      → schemas/calagemSchema.ts (validarEntrada)
      → services/motorCalagem.ts::executarMotorCalagem()
          → services/calculadoraCalagem.ts (fórmulas)
          → services/tabelaSmp.ts (lookup)
      → database/analises.ts::salvarAnalise()   [talhao_id vem do form]
      ← { sucesso, resultado }
  ← tela mostra resultado + oferece gerar PDF (client-side, pdfGenerator.ts)
```

## 2. Mapa de pastas

### Backend (`backend/src/`)

| Pasta | O que tem | Documento de referência |
|---|---|---|
| `config/` | `env.ts` — variáveis de ambiente centralizadas (`JWT_SECRET`, etc.) | — |
| `database/` | schema Drizzle (`schema.ts`) + funções de persistência por domínio (`analises.ts`, `adubacao.ts`, `fazendas.ts`) + conexão (`db.ts`) | `ref-calagem.md §7`, `ref-adubacao.md §7`, `ref-plataforma.md §2.2` |
| `middlewares/` | `authMiddleware.ts` — `verificarToken` + `verificarRole` | `ref-plataforma.md §1.3` |
| `routes/` | um arquivo por domínio de endpoint Express | `ref-plataforma.md`, `ref-calagem.md`, `ref-adubacao.md` |
| `schemas/` | validação zod por domínio (local — não usa `packages/shared-schemas`) | cada `ref-*.md §2` |
| `services/` | motores de cálculo, tabelas de referência, engine standalone | `ref-calagem.md`, `ref-adubacao.md` |
| `utils/` | testes automatizados (`*.test.ts`) | citado nos achados de cada `ref-*.md` |
| `server.ts` | ponto de entrada Express — monta CORS, JSON parser, e todas as rotas sob `/api/*` | §3 abaixo |

### Frontend (`frontend/src/`)

| Pasta | O que tem | Documento de referência |
|---|---|---|
| `pages/` | uma página por rota (calculadoras, dashboard, admin, auth) | `ref-plataforma.md` (maioria) + páginas de cálculo citadas em `ref-calagem.md`/`ref-adubacao.md` |
| `components/` | `Modal`, `ModalDetalhesAnalise`, `Navbar`, `ProtectedRoute` — reuso entre páginas | `ref-plataforma.md §1.4, §3.5, §4.5` |
| `contexts/` | `AuthContext` — estado global de sessão | `ref-plataforma.md §1.4` |
| `layouts/` | `PublicLayout`, `DashboardLayout` — casca visual por grupo de rota | `ref-plataforma.md §5.2` |
| `services/` | `api.ts` (cliente HTTP central), `ibge.ts` (dado externo), `pdfGenerator*.ts`, `pendencias.ts` | `ref-plataforma.md §2.2, §3.4, §3.5, §5.3` |
| `schemas/` | validação zod local (espelha o backend campo a campo) | achado de duplicação em `docs/03-calculo-adubacao.md §5.4` |

### Outros

| Pasta | O que é | Status |
|---|---|---|
| `packages/shared-schemas/` | pacote zod pensado como fonte única de validação | confirmado não usado / código mono (`docs/03-calculo-adubacao.md §5.4`) |
| `docs_antigos/` | manuais e auditorias anteriores (Manual RS/SC 2016, specs de calagem/adubação) | referência histórica, não código |
| `backend/dist`, `frontend/dist` | build compilado | versionado no git — achado de limpeza pendente, fora do escopo de documentação |

## 3. Rotas da API

Todas montadas sob `/api` em `server.ts:27-32`. Coluna "Auth" indica o
que o middleware exige antes do handler rodar.

| Método | Rota | Arquivo | Auth | O que faz |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | `authRoutes.ts` | pública (rate-limited) | cria usuário (`PRODUTOR`), retorna JWT |
| `POST` | `/api/auth/login` | `authRoutes.ts` | pública (rate-limited) | autentica, retorna JWT |
| `POST` | `/api/analises/calcular` | `analisesRoutes.ts` | pública (JWT opcional) | calcula calagem; salva vinculado ao usuário se token válido vier, senão como convidado |
| `POST` | `/api/analises/bulk` | `analisesRoutes.ts` | obrigatória | calcula + salva lote de amostras de calagem para um talhão |
| `GET` | `/api/analises/regional-stats` | `analisesRoutes.ts` | pública | médias/contagens agregadas de calagem por UF/cidade (usado pelo `MonitoramentoPage`) |
| `GET` | `/api/analises/historico` | `analisesRoutes.ts` | obrigatória | histórico unificado (calagem+adubação) do usuário; sem filtro se `ADMIN` |
| `POST` | `/api/adubacao/calcular` | `adubacaoRoutes.ts` | pública | calcula adubação, **não salva** (retorno só do cálculo) |
| `POST` | `/api/adubacao/salvar` | `adubacaoRoutes.ts` | obrigatória | persiste um resultado de adubação já calculado |
| `POST` | `/api/adubacao/bulk` | `adubacaoRoutes.ts` | obrigatória | calcula + salva lote de amostras de adubação (loop item a item, sem transação única) |
| `GET` | `/api/adubacao` | `adubacaoRoutes.ts` | obrigatória | lista análises de adubação do usuário logado |
| `GET` | `/api/adubacao/:id` | `adubacaoRoutes.ts` | obrigatória | detalhe de uma análise de adubação (só se for do usuário) |
| `GET` | `/api/fazendas` | `fazendasRoutes.ts` | obrigatória | lista fazendas do usuário + talhões aninhados + última análise de cada talhão |
| `POST` | `/api/fazendas` | `fazendasRoutes.ts` | obrigatória | cria fazenda |
| `DELETE` | `/api/fazendas/:id` | `fazendasRoutes.ts` | obrigatória | remove fazenda + talhões em cascata |
| `POST` | `/api/fazendas/:fazendaId/talhoes` | `fazendasRoutes.ts` | obrigatória | cria talhão numa fazenda do usuário |
| `DELETE` | `/api/fazendas/talhoes/:id` | `fazendasRoutes.ts` | obrigatória | remove talhão |
| `GET` | `/api/fazendas/talhoes/:id` | `fazendasRoutes.ts` | obrigatória | detalhe de um talhão |
| `GET` | `/api/fazendas/talhoes/:id/analises` | `fazendasRoutes.ts` | obrigatória | histórico de calagem daquele talhão (não inclui adubação) |
| `GET` | `/api/admin/stats` | `adminRoutes.ts` | `ADMIN` | métricas agregadas gerais (usuários, análises por UF/sistema) |
| `GET` | `/api/admin/users` | `adminRoutes.ts` | `ADMIN` | lista usuários + contagem de análises de cada um |
| `GET` | `/api/admin/users/:id/full-details` | `adminRoutes.ts` | `ADMIN` | fazendas+talhões+análises completos de um usuário, sem paginação |
| `GET` | `/api/admin/analises` | `adminRoutes.ts` | `ADMIN` | todas as análises (calagem+adubação) de todos os usuários, com autoria |
| `POST` | `/api/standalone/calcular` | `standaloneRoutes.ts` | **nenhuma** | engine alternativo de calagem (comparação/validação — ver `ref-adubacao.md` aviso no topo) |

## 4. Páginas do frontend

| Rota | Arquivo | Acesso | O que faz |
|---|---|---|---|
| `/` | `CalculadoraPage.tsx` | público | formulário + resultado de calagem (funciona sem login) |
| `/adubacao` | `AdubacaoPage.tsx` | público | formulário + resultado de adubação (funciona sem login) |
| `/monitoramento` | `MonitoramentoPage.tsx` | público | painel regional agregado (médias, sistemas, alertas) |
| `/validacao` | `ValidacaoAgronomicaPage.tsx` | público | compara `motorCalagem` vs. `motorStandalone` lado a lado (ferramenta interna de QA) |
| `/login` | `LoginPage.tsx` | público | formulário de login |
| `/RegisterPage` | `RegisterPage.tsx` | público | formulário de cadastro |
| `/dashboard` | `FazendasPage.tsx` | qualquer logado | lista/cria/exclui fazendas e talhões |
| `/dashboard/talhao/:id` | `TalhaoDetalhesPage.tsx` | qualquer logado | detalhe de um talhão + seu histórico de calagem |
| `/dashboard/nova-analise` | `NovaAnalisePage.tsx` | qualquer logado | inserção em lote (planilha) de amostras de calagem/adubação |
| `/historico` | `HistoricoAnalisesPage.tsx` | só `PRODUTOR` | histórico unificado das próprias análises, com filtro/busca/paginação |
| `/admin` | `AdminDashboardPage.tsx` | só `ADMIN` | métricas gerais do sistema |
| `/admin/usuarios` | `AdminUsersPage.tsx` | só `ADMIN` | lista usuários, detalhe completo por usuário |
| `/admin/analises` | `AdminAnalisesPage.tsx` | só `ADMIN` | todas as análises do sistema, com autoria |

## 5. Dicionário de arquivos

Descrição de uma linha por arquivo. Onde já existe detalhe completo em
outro documento, o link substitui a repetição.

### Backend

| Arquivo | O que faz |
|---|---|
| `server.ts` | monta Express, CORS, JSON parser e todas as rotas sob `/api` |
| `config/env.ts` | lê variáveis de ambiente (`JWT_SECRET`, etc.) num só lugar |
| `database/db.ts` | conexão Drizzle/Postgres |
| `database/schema.ts` | definição de todas as tabelas e enums (users, analises, analises_adubacao, fazendas, talhoes) |
| `database/analises.ts` | persistência/listagem de análises de calagem — detalhe em `ref-calagem.md §7` |
| `database/adubacao.ts` | persistência/listagem de análises de adubação — detalhe em `ref-adubacao.md §7` |
| `database/fazendas.ts` | CRUD de fazendas/talhões + histórico por talhão — detalhe em `ref-plataforma.md §2.2` |
| `middlewares/authMiddleware.ts` | `verificarToken` (JWT) + `verificarRole` (checagem de role) — detalhe em `ref-plataforma.md §1.3` |
| `routes/authRoutes.ts` | registro/login — detalhe em `ref-plataforma.md §1.1-1.2` |
| `routes/analisesRoutes.ts` | calcular/lote/histórico/stats regionais de calagem — detalhe em `ref-plataforma.md §3, §4.4` |
| `routes/adubacaoRoutes.ts` | calcular/salvar/lote/listar adubação — detalhe em `ref-plataforma.md §3.3` |
| `routes/fazendasRoutes.ts` | CRUD de fazendas/talhões — detalhe em `ref-plataforma.md §2.2` |
| `routes/adminRoutes.ts` | stats/usuários/análises agregadas para admin — detalhe em `ref-plataforma.md §4` |
| `routes/standaloneRoutes.ts` | expõe `motorStandalone.ts` sem autenticação — ver aviso em `ref-adubacao.md` |
| `schemas/authSchema.ts` | validação zod de registro/login |
| `schemas/calagemSchema.ts` | validação + tipos do motor de calagem — detalhe em `ref-calagem.md §2` |
| `schemas/adubacaoSchema.ts` | validação + tipos do motor de adubação — detalhe em `ref-adubacao.md §2` |
| `schemas/fazendasSchema.ts` | validação de criação de fazenda/talhão |
| `services/motorCalagem.ts` | orquestração do cálculo de calagem — `ref-calagem.md` inteiro |
| `services/calculadoraCalagem.ts` | fórmulas puras de calagem — `ref-calagem.md §4` |
| `services/tabelaSmp.ts` | Tabela 5.2 do manual (lookup) — `ref-calagem.md §5` |
| `services/warnings.ts` | textos de alerta da calagem |
| `services/motorAdubacao.ts` | orquestração do cálculo de adubação — `ref-adubacao.md` inteiro |
| `services/calculadoraAdubacao.ts` | conversão de extrator Mehlich-3→1 — `ref-adubacao.md §4.1` |
| `services/tabelasAdubacaoGraos.ts` | classificação de solo + tabelas de dose por cultura — `ref-adubacao.md §4.2, §5` |
| `services/warningsAdubacao.ts` | alertas de diagnose secundária — `ref-adubacao.md §6` |
| `services/motorStandalone.ts` | segunda implementação (divergente, já corrigida) da lógica de calagem — ver aviso em `ref-adubacao.md` |
| `utils/calagem.test.ts` | 20 casos de teste do motor de calagem |
| `utils/adubacao.test.ts` | 3 casos de teste do motor de adubação (cobertura baixa, ver `docs/03-calculo-adubacao.md §5.1`) |

### Frontend

| Arquivo | O que faz |
|---|---|
| `App.tsx` | declaração de todas as rotas e seus gates de acesso — `ref-plataforma.md §5.1` |
| `contexts/AuthContext.tsx` | estado de sessão (login/cadastro/logout, persistência em `localStorage`) — `ref-plataforma.md §1.4` |
| `components/ProtectedRoute.tsx` | gate de rota por login/role — `ref-plataforma.md §1.4` |
| `components/Navbar.tsx` | barra superior (links públicos + menu de conta) |
| `components/Modal.tsx` | modal genérico reutilizável (usado em `FazendasPage`) |
| `components/ModalDetalhesAnalise.tsx` | modal de detalhe de uma análise (calagem ou adubação) — usado no histórico e no detalhe de talhão |
| `layouts/PublicLayout.tsx` | casca visual das rotas públicas |
| `layouts/DashboardLayout.tsx` | casca visual das rotas autenticadas (sidebar por role) — `ref-plataforma.md §4.5` |
| `services/api.ts` | cliente HTTP central (axios, JWT automático, tratamento de 401) — `ref-plataforma.md §5.3` |
| `services/ibge.ts` | consumo da API pública do IBGE (estados/municípios RS/SC) — `ref-plataforma.md §2.2` |
| `services/pdfGenerator.ts` | geração de PDF de calagem no client — `ref-plataforma.md §3.5` |
| `services/pdfGeneratorAdubacao.ts` | geração de PDF de adubação no client |
| `services/pendencias.ts` | recupera cálculo feito como convidado após login/registro — `ref-plataforma.md §3.4` |
| `pages/LoginPage.tsx` | formulário de login |
| `pages/RegisterPage.tsx` | formulário de cadastro — `ref-plataforma.md §2.1` |
| `pages/CalculadoraPage.tsx` | formulário/resultado de calagem (página pública) |
| `pages/AdubacaoPage.tsx` | formulário/resultado de adubação (página pública) |
| `pages/MonitoramentoPage.tsx` | painel regional agregado — `ref-plataforma.md §4.4` |
| `pages/ValidacaoAgronomicaPage.tsx` | compara os dois motores de calagem lado a lado — ver aviso em `ref-adubacao.md` |
| `pages/FazendasPage.tsx` | CRUD de fazendas/talhões — `ref-plataforma.md §2.2` |
| `pages/TalhaoDetalhesPage.tsx` | detalhe de talhão + histórico de calagem — `ref-plataforma.md §3.2` |
| `pages/NovaAnalisePage.tsx` | inserção em lote (planilha) — `ref-plataforma.md §3.3` |
| `pages/HistoricoAnalisesPage.tsx` | histórico unificado do produtor — `ref-plataforma.md §3.1` |
| `pages/AdminDashboardPage.tsx` | métricas gerais — `ref-plataforma.md §4.1` |
| `pages/AdminUsersPage.tsx` | gestão/consulta de usuários — `ref-plataforma.md §4.3` |
| `pages/AdminAnalisesPage.tsx` | todas as análises do sistema — `ref-plataforma.md §4.2` |
| `schemas/calagemSchema.ts` | validação zod local de calagem (espelha o backend) |
| `schemas/adubacaoSchema.ts` | validação zod local de adubação (espelha o backend) |

---

## Como usar este mapa

Comece aqui para achar **onde** algo vive; depois vá para o `ref-*.md`
correspondente para o **como** funciona em detalhe. Se um arquivo não
aparece em nenhuma tabela acima, provavelmente é um arquivo de suporte
(config de build, tipos, estilos) fora do escopo destes documentos.
