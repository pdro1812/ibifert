# Levantamento de números — IbiFerti (06/10/2026)

Base: repositório local, branch `feat/cidade-estado-cadastro` (mesmo commit da `main`, 16a883a). Contagens de linhas feitas na árvore de trabalho, que inclui a mudança ainda não commitada em `RegisterPage.tsx` (+111/−48). Suítes de teste rodadas em 06/10/2026. Levantamento anterior: commit de 26/08/2026 (53f091b).

---

## 1. Evolução do repositório

- **Commits:** 121 no total, todos em `main`. Primeiro: 19/04/2026 (41bacab). Último: 05/10/2026 (16a883a). Desde 26/08: +30 (91 → 121).
- **Por mês:** abr 18 · mai 25 · jun 5 · jul 2 · ago 41 · set 15 · out 15 (até 05/10).
- **Linhas de código hoje:**
  - backend src: 3.108 (28 arquivos)
  - frontend src: 9.313 (33 arquivos ts/tsx)
  - testes: 922 (5 arquivos)
  - migrações SQL: 131 (6 arquivos)
  - total de código: ≈ 13,5 mil
  - documentação: 4.734 linhas em 15 `.md` em `docs/`
- **Primeiro commit × hoje:**
  - Arquivos: 30 → 153.
- **Branches:**
  - 4 locais (`main` + 3) e 2 no remoto (`main`, `fix/e2e-blocos-calculadora`).
  - As 3 locais além da `main` estão mescladas. Abertas com trabalho não mesclado: 0.
- **As 11 correções:** os merges de 22/08 somam exatamente 11 branches, todas mescladas (antes do commit de 26/08). Nenhuma existe mais como branch. Nenhum documento define "as 11"; assumi este grupo:
  - merges locais (8): `auth-hardening`, `calagem-trava-pd-consolidado`, `motor-standalone`, `idor-fazendas-adubacao`, `security-hardening-menor`, `admin-adubacao-metrics`, `login-pendente-flow`, `cleanup-codigo-morto`
  - PRs (3): #4 `limpeza-schemas-e-enum`, #5 `jwt-secret-local-e-env-tracking`, #6/#7 `build-typescript-errors`

---

## 2. Validação agronômica

> **Atualização (12/10/2026):** a coordenadora validou todos os cenários do plano de testes (informado pelo desenvolvedor). As linhas abaixo descrevem a situação em 06/10 e ficam como histórico; onde dizem "não validou" ou "pendente", vale a validação posterior.

- **Plano de testes** (`docs/plano-testes-validacao-agronoma.md`): 9 cenários de calagem (C1–C9) + 8 de adubação (A1–A8) = 17.
  - Marcados como executados/aprovados no documento: 0 de 17 (17 caixas "Bateu" vazias, nenhuma observação preenchida).
  - Datas do plano: criado em 26/08; atualizado em 15/09, 28/09 e 05/10; notas de 02/10 no texto.
- **Execução registrada (pelo desenvolvedor, não pela coordenadora):**
  - 28/09: 17 cenários rodados na API real pela Calculadora Completa. 14 bateram de primeira.
  - C5, C6 e C8 divergiram só no `NC_vb`, por causa da correção `f6e9c4e` (16/09). Plano atualizado → 17/17.
  - Sem registro de nova rodada completa após a mudança de 02/10 (SMP em evidência); os testes automatizados cobrem essa mudança.
- **Registro da coordenadora** (os documentos usam "orientadora" e "coordenadora"):
  - Não existe checklist devolvido. O que existe é o item 8 de `docs/registro-alteracoes-propostas.md`: ela passou 3 cenários de adubação com doses esperadas, e o motor diverge nos 3 (6 valores):
    - Print soja (1º cultivo, P muito alto): P esperado 30, motor dá 0.
    - A3 (milho, correção Total): esperado N 120 / P 230 / K 160; motor dá 130 / 280 / 200.
    - A4 (soja, 2º cultivo): esperado P 45 / K 75; motor dá 0 / 0.
  - Diagnóstico em 02/10. Nenhuma correção aplicada: `motorAdubacao.ts` não muda desde 22/08 e "muito alto" ainda zera a dose. Faltam as 5 respostas dela.
  - Pedidos dela já implementados: remover "Tipo de Aplicação" (15/09); SMP sempre em evidência com alerta de divergência (02/10, PR #13).
  - Bugs corrigidos ao preparar os cenários (26/08): submit silencioso na Adubação em 7 dos 8 cenários; campo Boro travando.
- **Pendências de `docs/diagnostico-primeira-calagem-metodo-smp.md`:**
  - Resolvidas:
    - "Tipo de Aplicação" removido; tudo é reaplicação (15/09).
    - SMP sempre em evidência; Polinomial complementar (02/10).
    - Trava do "solo tamponado" corrigida, com `V_atual` exigido (16/09).
    - C3 e C9 atualizados no plano; testes CT-23 a CT-27 novos (05/10).
  - Parcial: a regra do limiar 6,3 estava em 3 cópias; `NovaAnalisePage` agora usa a função compartilhada, mas resta uma cópia em `frontend/src/schemas/calagemSchema.ts`.
  - Abertas:
    - Confirmação da coordenadora sobre o C3: com SMP 6,8 o valor em evidência virou 0,3 t/ha contra 5,55 t/ha do Polinomial (~18×); só o alerta mitiga.
    - O Polinomial complementar não é gravado no banco (não aparece no histórico).
    - A tela antiga `/calagem` não tem o checkbox do Polinomial.

---

## 3. Funcionalidades hoje

- **Telas:** 15 (eram 12). 3 novas.
- **Novas:**
  - CalculadoraCompleta (`/`): calagem, adubação ou ambas numa tela; virou a home.
  - Feedback (`/feedback`, pública): formulário "Reportar um problema", sem login.
  - AdminFeedback: lista com busca dos feedbacks recebidos.
- **Antigas:**
  - Login: acesso por e-mail e senha.
  - Register: cadastro de conta, sem CPF.
  - Calculadora: calagem original, agora em `/calagem` como backup, sem link na navbar.
  - Adubacao: adubação NPK com alertas, em `/adubacao` como backup.
  - Monitoramento: estatísticas regionais agregadas, pública.
  - Fazendas: "Minhas Propriedades", cria e exclui fazendas e talhões.
  - TalhaoDetalhes: detalhe e histórico de análises do talhão.
  - NovaAnalise: "Inserção Rápida de Lotes".
  - HistoricoAnalises: lista unificada de calagem e adubação, só para produtor.
  - AdminDashboard: métricas gerais.
  - AdminUsers: base de produtores com detalhe completo.
  - AdminAnalises: todas as amostras do sistema.
- **Lote** (`/dashboard/nova-analise`): grade tipo planilha, digitada à mão.
  - Importação por arquivo, CSV, Excel ou colar da planilha: **não existe** (sem input de arquivo, sem tratamento de colar, sem biblioteca).
  - Escolhe-se fazenda e talhão por linha (ambos criáveis na hora pelo "+"). Modos: Calagem, Adubação ou Ambos (padrão).
  - Cada linha é validada pelos schemas Zod; qualquer erro bloqueia o lote inteiro.
  - Os dois endpoints de bulk rodam em paralelo; numa falha parcial, só as linhas não salvas são reenviadas.
- **Agrupamento e histórico:**
  - Hierarquia: usuário → fazenda (nome, UF, município) → talhão (nome, cultura) → análises. Calagem e adubação ficam em tabelas separadas, sem vínculo entre si.
  - As rotas de fazendas só devolvem dados do dono.
  - `GET /analises/historico` junta calagem e adubação por data (admin vê tudo, produtor só o seu). A tela filtra por Todos/Calagem/Adubação, com busca, detalhe e PDF.
- **Endpoints REST:** 24 nos arquivos de rotas + 1 de saúde em `server.ts` = 25. Em 26/08 eram 22 nos arquivos de rotas; os 2 novos são do feedback.
  - fazendas 7 · adubação 5 · admin 5 · análises 4 · auth 2 · feedback 1
- **Banco:** 6 tabelas (users, analises, fazendas, talhoes, analises_adubacao, feedbacks) e 12 enums. 6 migrações (0000–0005). Em 26/08: 5 tabelas e 4 migrações. Novas: feedbacks (0004) e remoção do CPF (0005).
- **Motor de calagem desde agosto:**
  - 15/09: tudo é reaplicação; `V_atual` e `CTC_pH7` pedidos sempre no SMP.
  - 16/09: `NC_vb` recebe o fator de manejo (¼ no PD Consolidado, ½ no campo natural); a trava do PD Consolidado exige `V_atual`.
  - 02/10: SMP sempre em evidência. Polinomial vira complementar (checkbox ou automático com SMP > 6,3). Novo alerta de divergência (> 20% e ≥ 0,5 t/ha).
  - Alertas de calagem: 6 → 8. Com os 14 da adubação, são 22.
- **Motor de adubação desde agosto:** sem mudança; 16 culturas e 2 extratores (Mehlich-1 e 3).

---

## 4. Implantação

- **docker-compose.prod.yml:** 4 serviços.
  - backend (porta 3000 publicada)
  - frontend com nginx (portas 80/443, volumes do certbot)
  - Postgres 15 (volume `pgdata_prod`, porta não exposta)
  - certbot
- **Dockerfile.prod do backend:** build em duas fases (Node 20 alpine); imagem final roda como usuário `node`. O entrypoint roda `drizzle-kit push` (sincroniza o schema; não aplica as migrações versionadas) e inicia o servidor.
- **Dockerfile.prod do frontend:** build do Vite servido por nginx.
- **nginx.conf:** domínio `ibifert.duckdns.org`; HTTP redireciona para HTTPS (Let's Encrypt); SPA com fallback para `index.html`; proxy de `/api/` para o backend.
- **CI/CD:** existe 1 workflow do GitHub Actions, em push na `main`: testes do backend, Vitest e Playwright; só então build e push das 2 imagens para o Docker Hub.
- **.env:** não está rastreado (só o `.env.example`). 

---

## 5. Testes (rodados em 06/10/2026, todos passam)

- **Calagem (backend):** 29 casos (eram 20 em 26/08). Cobrem tabela SMP, fatores de manejo, trava de 5 t/ha, trava do solo tamponado, Saturação por Bases, Polinomial e divergência, PRNT, PD com restrição, validações e monitoramento 10–20 cm.
- **Adubação (backend):** 2 casos (soja de manutenção; milho com solo muito baixo e correção Total). A cobertura **não** foi ampliada. `npm test` e o CI só executam `calagem.test.ts`, então essa suíte nem roda no CI.
- **Frontend (Vitest):** 60 casos. 53 em `NovaAnalisePage` (matriz de habilitação de células × schema, nos 3 modos) e 7 em `AdubacaoPage` (normalização numérica e micronutrientes opcionais).
- **E2E (Playwright):** 16 casos em 1 arquivo (~16 s). Cobrem a matriz de blocos condicionais da calagem (manejo × pH × SMP), o checkbox do Polinomial e o Sistema de Cultivo derivado do manejo.
- **Total:** 107 casos automatizados passando.

---

## 6. Números para slide

1. **121** commits em 5,5 meses
2. **≈ 13,5 mil** linhas de código
3. **15** telas (3 novas)
4. **107** testes automatizados passando
5. **17** cenários agronômicos documentados e reproduzidos na API

Em 06/10 a recomendação era dizer "reproduzidos pelo desenvolvedor", porque a coordenadora ainda não tinha validado. **Em 12/10/2026 ela validou todos os cenários** (informado pelo desenvolvedor), então o número 5 pode ser citado como "17 cenários validados pela coordenadora".
