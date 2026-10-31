# Plano — alterações pedidas pela coordenação (ALT-001 a ALT-014)

Origem: `especificacao_alteracoes_ibiferti.md` (síntese, feita por IA, dos prints dos coordenadores).
Este documento confronta cada item com o código atual e define como implementar.
**Status: implementado na branch `feat/alteracoes-coordenacao` (31/10/2026)** — ver seção 5.

---

## 1. O que a especificação supõe e o código mostra diferente

| Item | A especificação diz | O código mostra |
|---|---|---|
| ALT-002/003 | "preservar as doses dos micronutrientes" | Não existe dose de micronutriente. Cu/Zn/B/Mn só geram o aviso "nível Baixo. Avaliar aplicação conforme recomendação específica da cultura" (`backend/src/services/warningsAdubacao.ts`). Só o S (20 kg S/ha) e o Mo da soja (g/ha) têm dose. |
| ALT-006 | "campo de texto livre UF no cadastro" | Já é um select com as 27 UFs do IBGE desde `c74db14`. Os prints são de uma versão anterior. |
| ALT-008 | "incluir o seletor de talhão por linha" | O seletor por linha já existe, com o botão "+" para criar talhão (`NovaAnalisePage.tsx:853`), e o salvamento agrupa por `talhao_id`. Mas o select usa borda e fundo transparentes e parece texto comum. Quando a propriedade não tem talhão, a lista fica vazia. |
| ALT-011 | "substituir o botão Aplicar" | "Aplicar" não é botão: é o status da calagem (`aplicar_calcario` = sim/não) na coluna Detalhes (`HistoricoAnalisesPage.tsx:313`). |
| ALT-014 | "salvar quando o usuário solicitar" | A calagem é salva automaticamente em todo cálculo, logado ou não (`analisesRoutes.ts:22`). O botão "Salvar" da calagem só mostra "Salvo!". A adubação exige o clique em salvar. |
| ALT-005 | dois motores em abas separadas | A tela principal (`/`) é a Calculadora Completa: um formulário só, com 3 modos (Apenas Calagem / Apenas Adubação / Ambos) e campos compartilhados (pH, MO, CTC, identificação). As telas antigas `/calagem` e `/adubacao` continuam no ar, sem link. |

Bugs reais encontrados no caminho:
- **Adubação salva sem localização.** A Calculadora Completa não envia `uf`/`cidade` ao salvar a adubação, e o backend grava `RS` / `"Não informada"` (`adubacaoRoutes.ts:51`). No modo "Apenas Adubação", a seção de localização nem aparece. O ALT-005 resolve isso.
- **A coluna "Talhão" do Histórico mostra `identificacao`**, não o nome do talhão vinculado (`HistoricoAnalisesPage.tsx:254`).
- **Excluir uma propriedade apaga os talhões** e deixa as análises com `talhao_id` apontando para um talhão que não existe mais. Elas continuam no histórico, porque o histórico filtra por usuário.

---

## 2. Impacto por item

| ALT | Viável | Impacto | Área |
|---|---|---|---|
| 001 Legenda do gráfico | sim | trivial | front |
| 002 Relatório PDF macro/micro/obs/alertas | sim | baixo, mas depende da classificação agronômica (dúvida 5) | front |
| 003 Mesma reorganização na tela | sim | baixo | front |
| 004 Remover opção "UF" | sim | trivial | front |
| 005 Localização nos dois motores | sim | médio. Corrige o bug da adubação sem localização | front + backend (`/adubacao/salvar`) |
| 006 Seletor RS/SC + localidade preferencial | sim | médio. Novo endpoint, `/me` e login passam a devolver cidade/estado | front + backend |
| 007 Preservar dados ao trocar de modo | sim | **médio-alto**: mexe no ciclo do formulário (`shouldUnregister`). Se for feito de forma ingênua, pode mandar ao motor campos de blocos ocultos e alterar o cálculo | front |
| 008 Talhão por linha | já existe | baixo (só ajuste visual e de UX) | front |
| 009 Navegação "Análise Rápida" | sim | médio (rotas e layouts). O cálculo já é compartilhado: os motores ficam no backend e são chamados pela mesma página | front |
| 010 Editar propriedade/talhão + Fazenda→Propriedade | sim | baixo-médio. 2 endpoints `PUT` novos | front + backend |
| 011 Editar/Excluir/Arquivar | sim | **alto**: endpoints novos, migração e modo "edição" da calculadora. Editar recalcula com o motor **atual**: uma análise antiga editada pode mudar de resultado se a regra mudou desde então (ex.: as doses de P/K corrigidas em `e7fe458`) | front + backend + migração |
| 012 Área de arquivadas | sim | médio (depende do 011) | front + backend |
| 013 Data da análise ≠ data de inserção | sim | médio. Coluna nova, que aparece em formulário, lote, edição, listagem e modal | front + backend + migração |
| 014 Salvar explícito | sim | **alto**: muda a regra "toda calagem é gravada", que hoje alimenta o **Monitoramento Regional** (inclusive com cálculos de visitantes) | backend + front |

Nada quebra se for feito com cuidado. Os riscos reais estão no **007** (pode alterar o cálculo), no **011** (a edição recalcula) e no **014** (pode reduzir os dados do Monitoramento Regional).

---

## 3. Dúvidas (precisam de confirmação)

1. **Qual tela aparece nos prints?** Entendemos que as "abas Calagem / Adubação" são os 3 cartões de modo da Calculadora Completa. O fato de o cadastro aparecer com UF em texto livre indica que o servidor estava numa versão anterior a 30/10.
2. **Salvar explícito (ALT-014)**:
   - **A (recomendado)**: o cálculo continua gravando um registro anônimo (o Monitoramento Regional não perde dados). A análise só entra no histórico do usuário quando ele clica em "Salvar". O cálculo devolve o `id`, e o "Salvar" vincula o registro ao usuário (e ao talhão e à data da análise, se informados).
   - B: só grava quando o usuário clica em "Salvar". Visitantes deixam de alimentar o Monitoramento Regional.
   - C: mantém como hoje (logado = salvo automaticamente) e só deixa a interface mais clara.
3. **Estados**: limitar a **RS e SC em todo lugar** (cadastro, calculadora, propriedade, inserção rápida)? O manual cobre só RS/SC. Usuários antigos de outros estados ficam como estão até editarem o cadastro.
4. **Localidade preferencial**: reaproveitar `users.cidade/estado` do cadastro (recomendado: sem migração, e é o mesmo conceito), editável num cartão "Perfil regional" em Minha Conta? A alternativa são colunas separadas.
5. **Classificação das mensagens de adubação** (confirmar com a agrônoma):

   | Código | Hoje | Proposta |
   |---|---|---|
   | `S_BAIXO` (20 kg S/ha) | AVISO | tabela **Macronutrientes** (linha Enxofre) |
   | `MICROS_Cu/Zn/B/Mn_BAIXO` | AVISO | tabela **Micronutrientes** (classe "Baixo", recomendação "avaliar conforme a cultura", sem dose porque o motor não calcula) |
   | `MO_SOJA` (Mo 12–25 g/ha semente / 25–50 g/ha foliar) | AVISO | tabela **Micronutrientes** (linha Molibdênio) |
   | `BNF_INOCULAR`, `S_SOJA_DICA`, `P_MUITO_ALTO_REP`, `K_LIMITE_SEMEADURA`, `N_REND_ALTO` | INFO/AVISO | **Observações técnicas** |
   | `CA_BAIXO`, `MG_BAIXO`, `N_CEVADA_CERVEJEIRA` | AVISO | **Alertas e Avisos** |

   A tabela de micronutrientes deve listar só os que estão baixos (como hoje) ou os 4 sempre, com a classe de cada um?
6. **Localização no modo "Ambos"**: um bloco só, compartilhado pelos dois motores (recomendado, porque é a mesma amostra), visível nos 3 modos e preservado ao trocar de modo. A alternativa são dois blocos independentes, como a especificação descreve.
7. **"Análise Rápida" no menu**: uma entrada só, que abre a Calculadora Completa com os 3 modos (recomendado). A alternativa são duas entradas, Calagem e Adubação.
8. **Telas antigas `/calagem` e `/adubacao`** (cerca de 1.700 linhas sem link): podem ser removidas? Elas são exatamente as "versões divergentes" que o ALT-009 quer evitar.

---

## 4. Plano de execução (uma branch + PR por fase, nunca push em `main`)

### Fase 1 — Ajustes rápidos de interface (`fix/ui-ajustes-coordenacao`)
- **ALT-001**: criar `frontend/src/constants/sistemaManejo.ts` com `SISTEMA_LABEL` = Convencional / P. D. Consolidado / P. D. em Implantação. Usar em `MonitoramentoPage` (mapear `name` antes do `<Pie>`; as cores seguem o índice e não mudam), `AdminDashboardPage` e `HistoricoAnalisesPage`.
- **ALT-004**: remover `<option value="">UF</option>` da Calculadora Completa (o padrão "RS" já vem selecionado). Mesmo ajuste no cadastro.
- **ALT-008**: no select de talhão, deixar a borda visível e mostrar "Cadastre um talhão (+)" quando a lista estiver vazia. Adicionar a ação "aplicar este talhão a todas as linhas". Conferir no navegador o fluxo propriedade sem talhão → criar → salvar o lote.
- **ALT-010 (nomenclatura)**: "Fazenda" → "Propriedade" em todos os textos visíveis (`FazendasPage`, `NovaAnalisePage`, `AdminUsersPage`, `TalhaoDetalhesPage`, mensagens de `alert`/`confirm`). Nenhum nome de tabela, rota ou variável muda.
- Corrigir a coluna "Talhão" do Histórico: o backend `/historico` faz join com `talhoes` e devolve `talhao_nome`, e a identificação fica como texto secundário.

### Fase 2 — Recomendações × Observações × Alertas (`feat/adubacao-macro-micro`)
- **ALT-002/003**: criar a função pura `frontend/src/services/classificarMensagensAdubacao.ts` (`codigo` → `macro | micro | observacao | alerta`), com teste unitário. A classificação usa o `codigo`, então também funciona com análises antigas salvas em `recomendacao_json`.
- PDF (`pdfGeneratorAdubacao.ts`): tabela verde com os subtítulos **Macronutrientes** (N, P₂O₅, K₂O, + S) e **Micronutrientes**, depois a tabela "Observações técnicas" (azul) e por último "Alertas e Avisos" (amarelo).
- Tela (Calculadora Completa): mesma ordem, e os cartões de micronutrientes no mesmo estilo dos de N/P/K. Observações em azul (ícone Info), alertas em laranja (ícone AlertTriangle).
- Calagem: aplicar a mesma ordem por consistência (`nota_tecnica` em Observações; `acao_requerida` e `alertas` em Alertas e Avisos).
- Motor e doses intocados: só muda a apresentação.

### Fase 3 — Localização, perfil regional e preservação do formulário (`feat/localizacao-perfil-regional`)
- **ALT-006 (backend)**: `/auth/me` e `/auth/login` passam a devolver `cidade`/`estado`. Novo `PATCH /api/auth/me/localidade` com zod (`estado ∈ {RS, SC}`, cidade obrigatória). Testes em `auth.test.ts`.
- **ALT-006 (front)**: no cadastro, select com "RS — Rio Grande do Sul" / "SC — Santa Catarina", dentro do grupo "Perfil regional". Em Minha Conta, um cartão "Perfil regional" editável. O `AuthContext` expõe `cidade`/`estado`.
- **ALT-005**: o bloco de localização aparece nos 3 modos. Quando o usuário está logado e o campo ainda não foi mexido, ele é preenchido com o perfil regional. `salvarAdubacao` passa a enviar `uf`/`cidade`, e o backend deixa de usar o padrão silencioso `RS`/`"Não informada"` e passa a exigir os dois campos.
- **ALT-007**: ao trocar de modo, guardar `getValues()` num `ref` e reaplicar depois da troca (os campos remontados recebem os valores salvos). O `shouldUnregister: true` continua, para que os blocos condicionais internos da calagem (B1/B2/B3) não mandem campos ocultos ao motor. Os resultados de cada motor deixam de ser apagados na troca de modo. Cada resultado guarda o snapshot da entrada que o gerou e, se a entrada mudar, ganha o selo "dados alterados, recalcule".
- Testes: e2e em `calculadora-blocos.spec.ts` (preencher → calcular → trocar de modo várias vezes → os campos e o resultado continuam lá) e um teste que confirma que o payload enviado ao motor é idêntico antes e depois.

### Fase 4 — Editar propriedade e talhão (`feat/editar-propriedade-talhao`)
- Backend: `PUT /api/fazendas/:id` (nome, município, UF) e `PUT /api/fazendas/talhoes/:id` (nome, cultura), com checagem de dono igual à do `DELETE`. Zod em `fazendasSchema.ts`.
- Front: botão "Editar" ao lado de "Remover" nos dois cartões, reaproveitando os modais de cadastro (preenchidos com os dados atuais). Atualização otimista da lista.
- O `confirm` de remoção da propriedade avisa que as análises continuam no histórico.

### Fase 5 — Gerenciamento de análises (`feat/gerenciar-analises`)
- **Migração** (`npm run db:generate`; nunca `migrate`/`push` em banco real): `analises` e `analises_adubacao` ganham `data_analise date NULL` e `arquivada_em timestamp NULL`. Só adiciona colunas nulas e não toca dados existentes.
- **ALT-013**: campo "Data da análise" (opcional, não pode ser futura) na Calculadora Completa e na Inserção Rápida (um campo global do lote). A listagem mostra a data da análise e, abaixo, "inserida em …" em cinza. Quando não houver data, mostra "não informada". O modal de detalhes exibe as duas datas.
- **ALT-011**:
  - Backend: `PUT /analises/:id`, `PUT /adubacao/:id` (revalida e **recalcula** com o motor, mantém `id`, `criado_em`, `talhao_id`), `DELETE` nos dois e `PATCH …/:id/arquivar` / `…/desarquivar`. Todos verificam `usuario_id = req.userId`. Testes de autorização (o usuário A não mexe na análise de B).
  - Front: a coluna "Detalhes" vira "Ações" (Editar · Arquivar · Excluir, com ícones e cores distintas; Excluir pede confirmação dizendo que é definitivo). O status "Aplicar/Não aplicar" passa para a coluna Recomendação. Clicar na linha continua abrindo o modal.
  - "Editar" abre a Calculadora Completa em modo edição (`/analise-rapida?editar=<tipo>:<id>`), com o formulário preenchido. O botão vira "Recalcular e salvar alterações" e um aviso diz que o resultado será recalculado com as regras atuais.
- **ALT-012**: abas "Ativas | Arquivadas" na própria tela de Histórico (`/historico?arquivadas=1`), reaproveitando a tabela, a busca e os filtros. Nas arquivadas, as ações são Restaurar · Editar · Excluir. O `/historico` aceita `?arquivadas=true|false`.
- O Monitoramento Regional não considera o arquivamento (arquivar só organiza a lista).

### Fase 6 — "Análise Rápida" e salvar explícito (`feat/analise-rapida`)
- **ALT-009**: rota `/analise-rapida` dentro do `DashboardLayout` (usuário logado, com a barra lateral), que renderiza o **mesmo** `CalculadoraCompletaPage`. A rota pública `/` continua para visitantes. Na barra lateral entra o item "Análise Rápida", e a navbar troca "Calculadora" por "Análise Rápida". Usuário logado que abre `/` vai para o painel.
- Quando o usuário está logado, a Análise Rápida ganha o campo opcional "Vincular a um talhão" (propriedade → talhão), que usa o `talhao_id` já aceito pelo backend.
- **ALT-014**: conforme a resposta da dúvida 2. Na opção A: `/analises/calcular` sempre grava com `usuario_id NULL` e devolve o `id`. O novo `POST /analises/:id/salvar` (autenticado) vincula o usuário, o talhão e a data só se o registro ainda não tiver dono. O resultado mostra o selo "Cálculo temporário" até ser salvo e "Salvo no seu histórico" depois. O fluxo de "salvar sem login → login → recuperar" (`pendencias.ts`) continua funcionando.
- Remover `/calagem`, `/adubacao` e as duas páginas antigas (se a dúvida 8 confirmar). O `normalizarNumero` usado no teste vai para `FormFields`.

### Verificação por fase
- Backend: `cd backend && npm run build && npm test`
- Frontend: `cd frontend && npm run lint && npm test && npm run build`
- E2E nas fases 2, 3, 5 e 6: `cd frontend && npm run test:e2e`
- Conferência visual no navegador (preview) de cada tela alterada.
- Os testes de calagem e adubação (`calagem.test.ts`, `adubacao.test.ts`) precisam continuar verdes sem nenhuma alteração: nenhuma fase mexe em fórmula.

---

## 5. Decisões da coordenação e o que foi feito

Respostas às dúvidas da seção 3: (1) os prints eram de uma versão antiga;
(2) opção A; (3) só RS/SC em todo lugar; (4) reaproveitar cidade/estado do
cadastro; (5) micronutrientes só os que têm alerta/recomendação; (6) um bloco
de localização só; (7) navegação "Análise Rápida" fica para depois (ALT-009
não foi feito); (8) telas antigas removidas.

| ALT | Situação |
|---|---|
| 001 | feito — `constants/sistemaManejo.ts` |
| 002/003 | feito — `services/organizarRecomendacaoAdubacao.ts` (tela + PDF) |
| 004 | feito — seletores com lista fixa RS/SC, sem "UF" |
| 005 | feito — localização nos 3 modos; adubação passa a salvar a localização |
| 006 | feito — "Perfil regional" no cadastro e em Minha Conta (`PATCH /auth/me/localidade`) |
| 007 | feito — valores e resultados preservados na troca de modo, aviso de resultado desatualizado |
| 008 | ajuste visual (o seletor já funcionava) + "usar o da 1ª linha em todas" |
| 009 | **não feito** (pedido para aguardar) |
| 010 | feito — editar propriedade/talhão + "Fazenda" → "Propriedade" |
| 011/012 | feito — Editar/Arquivar/Excluir, aba Arquivadas, edição na própria calculadora |
| 013 | feito — `data_analise` (migração `0006_data_analise_e_arquivamento`, só colunas nulas) |
| 014 | feito — opção A (`POST /analises/:id/salvar`, selo "Cálculo temporário" / "Salvo") |

Também corrigido no caminho: a identificação da calagem digitada na
calculadora nunca era salva; a coluna "Talhão" do histórico mostrava a
identificação; o cadastro após "Salvar" perdia o tipo do resultado.

Limitação conhecida: os campos do monitoramento 10–20 cm (pH, Al sat e
checkboxes) não são gravados pelo cálculo da calculadora (o payload do motor
só leva o que o motor usa), então ao editar uma análise com monitoramento
eles precisam ser preenchidos de novo.
