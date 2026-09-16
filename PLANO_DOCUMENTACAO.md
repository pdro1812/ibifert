# Plano de Documentação Completa — Ibiferti

## Objetivo

Produzir uma documentação completa da aplicação (recomendação de calagem e adubação,
com CRUDs de suporte e painel admin), cobrindo:

1. O que cada arquivo faz.
2. Como cada recomendação (calagem / adubação) é calculada — fórmulas, tabelas de
   referência, regras agronômicas.
3. Quais dados entram no cálculo e quais dados são persistidos.
4. Falhas de segurança (auth, autorização, validação de input, exposição de dados).
5. Código morto / duplicado / não utilizado, e oportunidades de reuso.

## Por que dividir em etapas

O repo já é grande o suficiente para que uma única passada percam-se detalhes
(principalmente nas regras de cálculo, que são as partes mais críticas e mais
prováveis de conter bugs silenciosos). Cada etapa abaixo é escopada para caber em
uma sessão de revisão focada, e cada uma termina com uma entrega verificável em
arquivo — nada fica só "na conversa".

## Levantamento inicial (feito)

Estrutura confirmada:

```
backend/
  src/database/      -> schema.ts, db.ts, adubacao.ts, analises.ts, fazendas.ts
  src/middlewares/    -> authMiddleware.ts
  src/routes/         -> authRoutes, adminRoutes, adubacaoRoutes, analisesRoutes,
                          fazendasRoutes, standaloneRoutes
  src/schemas/        -> validação zod local (auth, calagem, adubação)
  src/services/       -> calculadoraCalagem, calculadoraAdubacao,
                          motorCalagem, motorAdubacao, motorStandalone,
                          tabelaSmp, tabelasAdubacaoGraos, warnings, warningsAdubacao
  src/utils/           -> *.test.ts (calagem, adubação)
frontend/
  src/pages/           -> Login, Register, Calculadora, Adubacao, NovaAnalise,
                          HistoricoAnalises, TalhaoDetalhes, ValidacaoAgronomica,
                          Fazendas, Monitoramento, Admin(Dashboard/Analises/Users)
  src/components/      -> Modal, ModalDetalhesAnalise, Navbar, ProtectedRoute
  src/contexts/        -> AuthContext
  src/services/        -> api.ts, ibge.ts, pdfGenerator*.ts
  src/schemas/         -> validação zod local (duplicada com backend?)
packages/shared-schemas/ -> schemas zod que deveriam ser a fonte única (adubação,
                            auth, calagem) — checar se front/back ainda usam cópias
                            locais em vez desse pacote (candidato a código morto/
                            duplicação já visível de cara)
docs_antigos/           -> documentação e auditoria anteriores sobre adubação
                            (adubacao.md, auditoria_adubacao.html, regras_calagem_
                            graos_v2.md, Manual de Calagem e Adubação RS/SC 2016) —
                            usar como referência para validar se o código implementa
                            corretamente as regras agronômicas descritas
```

Achado preliminar a validar na Etapa 1: existem schemas zod duplicados em
`backend/src/schemas`, `frontend/src/schemas` e `packages/shared-schemas/src` —
precisa confirmar se `packages/shared-schemas` já está de fato em uso ou se é
uma migração inacabada (código morto potencial ou fonte de divergência de
validação entre front e back).

---

## Etapa 1 — Fundação: Auth, Banco de Dados e Roteamento

**Escopo:** `backend/src/database/*`, `backend/src/middlewares/authMiddleware.ts`,
`backend/src/routes/authRoutes.ts`, `backend/src/routes/adminRoutes.ts`,
`backend/src/schemas/authSchema.ts`, `backend/src/server.ts`,
`frontend/src/contexts/AuthContext.tsx`, `frontend/src/components/ProtectedRoute.tsx`.

**Por quê primeiro:** tudo mais depende de saber quem é o usuário, o que ele pode
acessar, e qual é o schema real do banco. Também é onde falhas de segurança têm
maior impacto (autenticação, JWT, senha, escalonamento para admin).

**Entrega (`docs/01-auth-e-dados.md`):**
- Diagrama/lista do schema do banco (tabelas, colunas, relações) a partir de
  `schema.ts`.
- Fluxo de autenticação: registro → hash de senha (bcrypt) → login → emissão de
  JWT → middleware de verificação → rotas protegidas/admin.
- Mapa de quem acessa o quê: cada rota do `adminRoutes.ts` vs `authMiddleware`
  (existe checagem de role em todas? alguma rota admin desprotegida?).
- Achados de segurança dessa camada: segredo do JWT, expiração de token,
  rate limiting (ou ausência), CORS, exposição de dados sensíveis nas respostas
  (ex.: hash de senha retornando no JSON), SQL/queries via Drizzle (checar uso
  de parâmetros vs concatenação).
- Lista de código morto encontrado nessa camada.

---

## Etapa 2 — Motor de Cálculo: Calagem

**Escopo:** `backend/src/services/calculadoraCalagem.ts`,
`backend/src/services/motorCalagem.ts`, `backend/src/services/tabelaSmp.ts`,
`backend/src/schemas/calagemSchema.ts`, `backend/src/utils/calagem.test.ts`,
cruzando com `docs_antigos/regras_calagem_graos_v2.md` e o manual RS/SC 2016 como
fonte da verdade agronômica.

**Entrega (`docs/02-calculo-calagem.md`):**
- Quais dados de entrada o cálculo exige (análise de solo: pH, Al, Ca, Mg,
  CTC, etc.) e de onde vêm (input do usuário vs tabela SMP).
- Passo a passo da fórmula/algoritmo implementado em `motorCalagem.ts` /
  `calculadoraCalagem.ts`, com a fórmula equivalente do manual, apontando
  divergências se houver.
- O que é `tabelaSmp.ts` e como é usada (lookup table — confirmar se está
  completa/correta contra o manual).
- Quais avisos (`warnings.ts`, se aplicável a calagem) são gerados e quando.
- Cobertura dos testes (`calagem.test.ts`): o que está testado, o que falta.
- O que é salvo no banco ao final do cálculo (tabela, campos).

---

## Etapa 3 — Motor de Cálculo: Adubação

**Escopo:** `backend/src/services/calculadoraAdubacao.ts`,
`backend/src/services/motorAdubacao.ts`,
`backend/src/services/tabelasAdubacaoGraos.ts`,
`backend/src/services/warningsAdubacao.ts`,
`backend/src/services/motorStandalone.ts`,
`backend/src/routes/standaloneRoutes.ts`,
`backend/src/schemas/adubacaoSchema.ts`,
`backend/src/utils/adubacao.test.ts`,
cruzando com `docs_antigos/adubacao.md`, `auditoria_adubacao.html`,
`analise_arquitetura_adubacao.md` e `plano_implementacao_adubacao.md` (auditoria
anterior já feita — usar para não repetir trabalho e verificar se as observações
de lá já foram corrigidas ou continuam valendo).

**Por que é a maior etapa:** é o módulo com mais arquivos de serviço e mais
documentação legada — indica que é a área historicamente mais problemática/
revisada. Merece a etapa dedicada mais extensa.

**Entrega (`docs/03-calculo-adubacao.md`):**
- Dados de entrada (cultura, expectativa de produtividade, análise de solo,
  nutrientes P/K/etc.).
- Estrutura das tabelas de referência em `tabelasAdubacaoGraos.ts` (por
  cultura/faixa) e se batem com o manual RS/SC.
- Passo a passo do algoritmo em `motorAdubacao.ts` vs `calculadoraAdubacao.ts`
  (entender a divisão de responsabilidade entre os dois — candidato a
  sobreposição/duplicação a verificar).
- O que é `motorStandalone.ts` / `standaloneRoutes.ts` — é um fluxo
  paralelo/alternativo? Câmbio de API pública sem autenticação? (checar
  segurança aqui especificamente, já que "standalone" sugere rota sem os
  mesmos controles).
- Regras de warnings (`warningsAdubacao.ts`): quando disparam, o que
  comunicam ao usuário.
- Comparação com achados da auditoria antiga (`docs_antigos/auditoria_
  adubacao.html`) — o que foi corrigido, o que ainda é válido.
- O que é salvo no banco (`database/adubacao.ts`).

---

## Etapa 4 — CRUDs de Apoio (Análises e Fazendas)

**Escopo:** `backend/src/routes/analisesRoutes.ts`,
`backend/src/database/analises.ts`, `backend/src/routes/fazendasRoutes.ts`,
`backend/src/database/fazendas.ts`,
frontend: `NovaAnalisePage`, `HistoricoAnalisesPage`, `TalhaoDetalhesPage`,
`FazendasPage`, `ValidacaoAgronomicaPage`, `ModalDetalhesAnalise.tsx`.

**Entrega (`docs/04-cruds-apoio.md`):**
- Modelo de dados de análises de solo e fazendas/talhões, e como se relacionam
  com os cálculos das etapas 2 e 3.
- Fluxo de CRUD completo por entidade (criar/listar/editar/excluir) —
  front ↔ rota ↔ banco.
- Autorização por dono do recurso: um usuário consegue ver/editar
  análises de outro usuário trocando um ID na URL? (IDOR — checagem de
  segurança específica desta etapa).
- Código morto/duplicado nessas páginas e rotas.

---

## Etapa 5 — Painel Admin e Monitoramento

**Escopo:** `frontend/src/pages/AdminDashboardPage.tsx`,
`AdminAnalisesPage.tsx`, `AdminUsersPage.tsx`, `MonitoramentoPage.tsx`,
cruzando de volta com `backend/src/routes/adminRoutes.ts` (já mapeado na
Etapa 1, aqui é o consumo no front + os dados agregados exibidos).

**Entrega (`docs/05-admin.md`):**
- Quais métricas/insights são mostrados a admin e de onde vêm (queries
  agregadas, cálculo no front vs no back).
- Verificação de que rotas admin não vazam para usuários comuns (revisão de
  `ProtectedRoute.tsx` + gating de menu no `Navbar.tsx`/`DashboardLayout.tsx`
  vs. proteção real no backend — é comum achar que só o front esconde o botão
  e a rota de API fica aberta).
- Gestão de usuários (`AdminUsersPage`): o que um admin pode fazer com outro
  usuário, e se há confirmação/proteção contra ações destrutivas.

---

## Etapa 6 — Frontend Restante (fluxos de cálculo do usuário final)

**Escopo:** `CalculadoraPage.tsx`, `AdubacaoPage.tsx`, `RegisterPage.tsx`,
`LoginPage.tsx`, `services/api.ts`, `services/ibge.ts`,
`services/pdfGenerator.ts` / `pdfGeneratorAdubacao.ts`, `schemas/*` do front.

**Entrega (`docs/06-frontend-fluxos.md`):**
- Jornada do usuário: preencher formulário → validação zod local → chamada
  `api.ts` → resposta → exibição/PDF.
- `ibge.ts`: que dado externo é consumido (município/UF?) e se afeta o
  cálculo agronômico ou é só cosmético/endereço.
- Geração de PDF: quais dados sensíveis vão para o PDF e onde ele é gerado
  (client-side — checar se dados que não deveriam sair do servidor estão
  sendo processados no browser).
- Duplicação de validação entre `frontend/src/schemas` e
  `packages/shared-schemas` — confirmar se `shared-schemas` é realmente
  importado em algum lugar (`grep` de imports) ou é pacote morto.

---

## Etapa 7 — Consolidação Final

**Entrega (`docs/00-visao-geral.md` + atualização das anteriores):**
- Documento-índice com arquitetura geral (diagrama de pastas/camadas e fluxo
  de dados ponta a ponta: usuário → front → API → service de cálculo →
  tabelas de referência → banco).
- Lista consolidada de **falhas de segurança** encontradas nas Etapas 1–6,
  priorizada por severidade (ex.: IDOR, rota sem auth, dado sensível
  exposto, validação só no client).
- Lista consolidada de **código morto/duplicado**, com recomendação por item
  (excluir, migrar para `shared-schemas`, unificar `motor*` vs
  `calculadora*`, etc.).
- Checklist do que ainda falta migrar/corrigir, para virar backlog.

---

## Formato de trabalho por etapa

Para cada etapa: leitura completa dos arquivos em escopo (não só grep), teste
manual do fluxo quando fizer sentido (rodar backend/frontend), comparação
com `docs_antigos/` quando existir referência, e o `.md` de saída fica no
diretório `docs/` do repo (a criar). Achados de segurança que forem críticos
são reportados assim que encontrados, sem esperar a consolidação final.

## Próximo passo

Começar pela **Etapa 1** (Auth + Banco + Roteamento), por ser a base de tudo e
concentrar o maior risco de segurança.

---

## Metodologia para Alterações Seguras

Como isso é software de recomendação agronômica real (calagem/adubação errada
tem consequência prática na lavoura, não só um bug visual), o processo de
alteração é mais rígido que o padrão.

### 1. Documentação é só leitura

Enquanto estivermos nas Etapas 1–7 do plano acima, **nenhum código é alterado**.
O objetivo dessas etapas é só ler, entender e registrar achados. Falhas de
segurança e código morto encontrados no caminho são **anotados na entrega da
etapa**, não corrigidos na hora — isso evita misturar "documentar o que existe"
com "mudar o que existe" e perder rastreabilidade do que era comportamento
original vs. correção.

### 2. Toda correção nasce em branch isolada

Nenhuma correção (segurança ou outra) é feita direto na branch principal.
Fluxo por correção:
1. Branch dedicada a partir da branch principal atualizada.
2. Granularidade: **por tema de correção**, não por etapa inteira e não
   por achado individual. Um tema agrupa achados relacionados (ex.:
   "auth hardening", "trava de calagem", "unificação motorStandalone",
   "IDOR fazendas/adubação") — às vezes coincide com uma etapa inteira
   (quando ela já é um fix isolado, como a Etapa 2), às vezes quebra uma
   etapa em 2–3 branches menores (quando ela mistura achados de
   severidade/assunto diferentes, como a Etapa 1). Objetivo: cada branch
   revisável e revertível sem arrastar mudanças não relacionadas.
3. **Antes de começar qualquer bloco de correção, releio o(s) documento(s)
   da(s) etapa(s) relevante(s) em `docs/`** para confirmar que nada foi
   esquecido desde que foram escritos.
4. Nada é commitado/enviado (push) ou mesclado sem sua revisão e aprovação
   explícita — nunca vou mesclar ou dar deploy sozinho.
5. **Fora do meu escopo**: a limpeza do `.env`/credenciais commitadas no
   git (achado #2 da consolidação) fica com você — não vou tocar nisso.

### 3. Antes de tocar em qualquer motor de cálculo (calagem/adubação)

Essa é a parte mais sensível do sistema. Antes de alterar qualquer fórmula em
`motorCalagem.ts`, `motorAdubacao.ts`, `calculadoraCalagem.ts`,
`calculadoraAdubacao.ts` ou nas tabelas de referência:
- **Capturar um baseline**: rodar um conjunto de casos de entrada reais/
  representativos e salvar as saídas atuais (mesmo que estejam erradas —
  é a referência do "antes").
- **Escrever teste que expõe a falha** encontrada, comparando o resultado
  atual com o valor correto (segundo o manual RS/SC ou a regra correta).
- Aplicar a correção só depois do teste existir e falhar do jeito esperado
  (prova que o teste pega o problema real).
- Rodar o baseline completo de novo depois da correção: qualquer caso que
  mudou de resultado e **não deveria** ter mudado é motivo de parar e revisar
  — o objetivo é corrigir exatamente a falha identificada, sem alterar
  recomendações que já estavam corretas.
- `backend/src/utils/*.test.ts` já existe como ponto de partida — vou avaliar
  a cobertura real na Etapa 2/3 e apontar lacunas antes de mexer em qualquer
  fórmula.

### 4. Antes de tocar em auth/autorização

Mudanças em `authMiddleware.ts`, JWT, ou checagem de role têm risco de
quebrar sessões de usuários já logados ou travar acesso legítimo. Qualquer
correção nessa área eu vou sinalizar explicitamente o impacto esperado (ex.:
"isso invalida tokens já emitidos, usuários vão precisar logar de novo")
antes de aplicar.

### 5. Migrações de banco

Se alguma correção exigir mudança de schema (`backend/src/database/schema.ts`
+ Drizzle), a migração é gerada e revisada com você antes de rodar
`db:migrate`/`db:push` — isso é uma ação com efeito direto em dados reais e
não reversível trivialmente sem backup.

### 6. Critério de "não quebrou nada"

Para cada correção: os testes existentes continuam passando, o baseline de
cálculo (item 3) não muda fora do esperado, e o fluxo afetado é testado
manualmente rodando a aplicação (login, CRUD, geração de recomendação) antes
de eu considerar a entrega pronta.

---

## Outros pontos de atenção identificados na estrutura

- **`packages/shared-schemas` parece não estar totalmente adotado** — se
  front e back estão validando com cópias locais divergentes em vez do
  pacote compartilhado, isso é uma fonte silenciosa de bugs (dado que passa
  na validação do front mas falha ou se comporta diferente no back, ou
  vice-versa). Vale confirmar isso logo na Etapa 1/6.
- **`standaloneRoutes.ts` / `motorStandalone.ts`** — o nome sugere um fluxo
  paralelo ao principal. Rotas "standalone" são candidatas comuns a ficarem
  sem a mesma autenticação/validação da rota "oficial" porque foram
  criadas à parte. Prioridade alta de checagem na Etapa 3.
- **PDF gerado no client (`pdfGenerator*.ts`)** — se algum dado que deveria
  ficar restrito ao usuário dono (ex.: dados de outra fazenda) estiver
  disponível no payload que monta o PDF no browser, isso é exposição de
  dado mesmo sem "vazar" via rede — vale olhar o payload, não só a tela.
- **`backend/dist` e `frontend/dist` estão versionados** (aparecem na
  estrutura) — isso costuma ser artefato de build que não deveria ir pro
  git; não vou editar nada ali (edito só `src/`), mas vale um alerta separado
  sobre isso não fazer parte do escopo de documentação/correção.
- **Arquivo `test_insert.ts` solto na raiz do backend** (fora de `src/`) —
  parece script de teste manual esquecido; vou investigar se é código morto
  ou uma ferramenta usada de propósito antes de sugerir remoção.
