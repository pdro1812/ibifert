# Registro de Alterações Propostas

> Arquivo vivo. Cada tópico é adicionado conforme surge na conversa — não
> precisam ser relacionados entre si. Serve para acumular, por alteração:
> o que muda, o impacto, o que pode quebrar em outras partes do código, e
> o que precisa ser ajustado em conjunto para a mudança não ficar pela
> metade.
>
> **Importante:** este arquivo é só planejamento/mapeamento. Nenhum código
> é alterado a partir dele — a implementação em si acontece à parte,
> quando combinado explicitamente.

## Como usar

- Cada alteração vira uma seção nova em "Alterações", numerada
  sequencialmente.
- Status possíveis: `proposto` (ainda só ideia/discussão) → `em análise`
  (mapeando impacto) → `pronto para implementar` → `implementado` →
  `descartado` (com o motivo).
- Nada é implementado automaticamente só por estar aqui.

## Índice

| # | Tópico | Status |
|---|--------|--------|
| 1 | CSV de alertas (texto + condição de disparo) | em análise — conteúdo levantado |
| 2 | Unificar calculadora com seletor calagem/adubação/ambos | **implementado** (nova tela, `/` e `/adubacao` intactas) |
| 3 | Adubação na Inserção Rápida ("amostras rápidas") | em análise — já existe, ver achado |
| 4 | Inserção Rápida: gerar calagem+adubação juntas | em análise |
| 5 | Seleção explícita de método (SMP/Polinomial/Sat. por Bases) | em análise — mudança maior do que parecia |
| 6 | Campo de feedback/erro para o usuário, visível ao admin | **implementado** |
| 7 | Levantamento de dados sensíveis / LGPD | em análise — achados de risco |
| 8 | Bug no cálculo de adubação em cenário específico | aguardando detalhes do usuário |

**Dependências entre itens:** 2 → 5 (ambos mexem no layout/agrupamento de
campos da calculadora de calagem, fazem sentido desenhados juntos); 3 → 4
(4 depende de 3 existir, mas ver achado do item 3 — já existe adubação na
Inserção Rápida, então 3 vira "só falta o modo combinado", quase o mesmo
trabalho de 4); 1 é útil concluir antes de 5, porque 5 propõe um alerta
novo (divergência entre métodos) e vale ter o inventário de alertas
fechado antes de somar mais um; 6 e 7 se tocam (o próprio conteúdo de um
feedback enviado por usuário é dado pessoal, herda as mesmas
preocupações do item 7).

---

## Alterações

### 1. CSV de alertas (texto + condição de disparo)

**Status:** em análise — conteúdo integral levantado, falta só exportar
**Data:** 2026-09-28

**O que muda:** gerar um CSV com todos os alertas/avisos que o sistema
mostra ao usuário, com o texto e a condição que os aciona.

**Arquivos/áreas envolvidas (leitura):** `backend/src/services/warnings.ts`,
`backend/src/services/warningsAdubacao.ts`, `backend/src/services/motorCalagem.ts`,
`backend/src/services/motorAdubacao.ts`.

**Levantamento completo — 20 alertas distintos (6 calagem + 14 adubação).**
Existem duas famílias com formato diferente: calagem usa `alertas: string[]`
(só texto); adubação usa objetos `{ nivel: 'INFO'|'AVISO'|'ERRO', codigo, mensagem }`
— o nível `ERRO` está no tipo mas nunca é usado em lugar nenhum (código morto).

**Calagem — `backend/src/services/warnings.ts`:**

| Nome | Texto | Condição de disparo | Definido em | Acionado em |
|---|---|---|---|---|
| MSG_SEM_NECESSIDADE_CALAGEM | "pH acima do limiar — não há necessidade de calagem no momento" | `CONVENCIONAL`/`PD_IMPLANTACAO` e `pH_agua ≥ 5.5`, ou `PD_CONSOLIDADO` e `pH_agua ≥ 5.5` | warnings.ts:1-2 | motorCalagem.ts:91, 105 |
| MSG_TRAVA_PD_CONSOLIDADO | "Embora o pH em água esteja abaixo de 5,5, a Saturação por Bases (V) está em nível adequado (≥65%) e a Saturação por Alumínio (m) está baixa (<10%)..." | `PD_CONSOLIDADO`, `pH_agua < 5.5`, `V_atual ≥ 65`, `Al_sat < 10` | warnings.ts:4-5 | motorCalagem.ts:124 |
| MSG_LIMITE_SUPERFICIAL_PD | "Dose calculada excede o limite de 5 t/ha para aplicação superficial..." | `PD_CONSOLIDADO` e `NC_calculada > 5.0` (dose é travada em 5 t/ha) | warnings.ts:7-8 | motorCalagem.ts:208-210 |
| MSG_AVALIACAO_AGRONOMICA | "Recomenda-se avaliação por engenheiro agrônomo antes de reiniciar o sistema plantio direto" | `Al_sat_10_20 ≥ 30` E (produtividade abaixo da média OU compactação restringindo raiz OU P 10-20 abaixo do crítico) | warnings.ts:10-11 | motorCalagem.ts:260-266, dentro de `avaliarMonitoramento10_20` — **essa função não é chamada por nenhuma rota em produção hoje**, só em teste (`calagem.test.ts:368,383`). O texto que o usuário vê vem de uma cópia hardcoded no frontend (`MSG_MONITORAMENTO_RESTRICAO`, `CalculadoraPage.tsx:44-45`), calculada 100% no cliente |
| MSG_NOTA_REAPLICACAO | "A definição do método a aplicar é decisão do técnico responsável. O valor recomendado por este sistema é sempre o valor SMP; a Saturação por Bases é apresentada apenas como referência complementar." | sempre que `calcular_tambem_sat_bases = true` (reaplicação, método roteado SMP) | warnings.ts:13-14 | motorCalagem.ts:93,107,126,144,244 — vai para `nota_tecnica`, não para `alertas[]` |
| MSG_SEM_REINICIO_PD | "Critérios de restrição do PD_COM_RESTRICAO não atendidos; não há indicação de reiniciar o sistema de plantio direto." | `PD_COM_RESTRICAO` e critérios de reinício não atendidos | warnings.ts:16-17 | motorCalagem.ts:131-142 |

**Adubação — `backend/src/services/warningsAdubacao.ts` + `motorAdubacao.ts`:**

| Código | Nível | Texto/template | Condição de disparo | Onde |
|---|---|---|---|---|
| S_BAIXO | AVISO | "S abaixo do teor crítico (X mg/dm³). Aplicar 20 kg S-SO4²⁻/ha." | `S < 2.0 mg/dm³` (o "crítico" no texto é na verdade o teto da faixa "médio", não o gatilho real — vale confirmar se é intencional) | warningsAdubacao.ts:17-23 |
| S_SOJA_DICA | INFO | "Pode-se substituir 1 saco de ureia/ha por 2 sacos de sulfato de amônio na 1ª cobertura." | condição acima + `cultura === soja` | warningsAdubacao.ts:24-30 |
| MO_SOJA | AVISO | "pH < 5,5 pode reduzir eficiência da FBN. Considerar Mo..." | `cultura === soja` e `pH_agua < 5.5` | warningsAdubacao.ts:35-41 |
| MICROS_Cu/Zn/B/Mn_BAIXO | AVISO | "{nutriente} em nível Baixo. Avaliar aplicação conforme recomendação específica da cultura." | Cu<0.2, Zn<0.2, B≤0.1, Mn<2.5 (mg/dm³) | warningsAdubacao.ts:44-62 |
| CA_BAIXO | AVISO | "Cálcio em nível Baixo. Avaliar calagem." | `Ca < 2.0 cmolc/dm³` | warningsAdubacao.ts:65-68 |
| MG_BAIXO | AVISO | "Magnésio em nível Baixo. Avaliar calagem com calcário dolomítico." | `Mg < 0.5 cmolc/dm³` | warningsAdubacao.ts:70-73 |
| BNF_INOCULAR | INFO | "Recomenda-se inoculação com rizóbio apropriado." | cultura fixadora de N (`infoCultura.bnf === true`) | motorAdubacao.ts:33-36 |
| N_REND_ALTO | AVISO | "Rendimento esperado > 10 t/ha. Considerar aumento de N em 20-40%..." | `rendimento_esperado > 10` em qualquer cultura não-BNF (comentário no código diz "milho", mas a condição vale para todas — comentário desatualizado) | motorAdubacao.ts:78-81 |
| N_CEVADA_CERVEJEIRA | AVISO | "CEVADA CERVEJEIRA — Malte Tipo Único: NÃO aplicar N após o espigamento..." | `cultura === cevada` e `finalidade_cevada === cervejeira_malte_unico` | motorAdubacao.ts:84-86 |
| P_MUITO_ALTO_REP | INFO | "Fósforo Muito Alto. Reposição estimada: X kg P₂O₅/ha..." | classe de P "muito_alto" e `numCultivo === 1` | motorAdubacao.ts:96-101 |
| K_LIMITE_SEMEADURA | AVISO | "K₂O total (X kg/ha) excede 80 kg/ha na linha..." | `doseK2O > 80 kg/ha` | motorAdubacao.ts:153-158 |

Fora dessa lista há ~10 mensagens de validação de campo (erro de
preenchimento, ex. "SMP inválido: deve estar entre 4.4 e 7.1.") em
`calculadoraCalagem.ts` e nos schemas Zod do frontend — não contei como
"alerta agronômico" porque são erro de formulário, não aviso pós-cálculo.

**Impacto / o que pode quebrar:** nenhum — é só extração de dados, não
mexe em código. Achados relevantes para decisão:
- `MSG_AVALIACAO_AGRONOMICA` é código morto no backend (a função que a
  gera não está conectada a nenhuma rota); o alerta que o usuário
  realmente vê é uma duplicata hardcoded no frontend, com sua própria
  lógica reimplementada no cliente.
- Persistência é assimétrica: alertas de **calagem** têm coluna própria
  (`alertas text[]` em `analises`) e aparecem no histórico/modal/admin;
  alertas de **adubação** só existem dentro do `jsonb` (`recomendacao_json`)
  e **não aparecem** no `ModalDetalhesAnalise`, `TalhaoDetalhesPage` nem
  nas telas de admin — só no resultado imediato da própria página e no PDF.

**Alterações necessárias em outras partes do código:** nenhuma obrigatória
para gerar o CSV em si. Se o objetivo for além do CSV (ex. consertar a
duplicação frontend/backend do alerta de monitoramento, ou expor alertas
de adubação no histórico/admin), isso é trabalho à parte — não incluído
aqui, só sinalizado.

**Decisão / próximos passos:** conteúdo acima está pronto para virar
`.csv` (colunas: módulo, nome/código, texto, condição, arquivo:linha,
onde aparece na UI). Falta só decidir se exporto como arquivo separado
quando você autorizar mudanças fora deste registro.

---

### 2. Unificar calculadora com seletor de calagem/adubação/ambos

**Status:** implementado
**Data:** 2026-09-28 (implementado em 2026-09-28)

**Decisão tomada:** em vez de alterar `CalculadoraPage.tsx`/`AdubacaoPage.tsx`,
criei uma tela nova (`/calculadora-completa`) que faz os dois cálculos. As
páginas `/` e `/adubacao` continuam existindo, com o mesmo código de sempre,
como pediu — servem de referência/backup enquanto a tela nova é validada.
Não removi nem redirecionei nada.

**Arquivos criados:**
- `frontend/src/pages/CalculadoraCompletaPage.tsx` — a tela nova.
- `frontend/src/components/FormFields.tsx` — `CampoNumerico`/`SelectPadrao`
  extraídos como componentes compartilhados (só usados pela tela nova; as
  páginas antigas continuam com suas cópias locais, intocadas).

**Arquivos alterados (pequenos, aditivos, retrocompatíveis):**
- `frontend/src/App.tsx` — rota nova `/calculadora-completa`, nada removido.
- `frontend/src/components/Navbar.tsx` — link novo "Calculadora Completa"
  (com badge "Novo"), os links "Calagem"/"Adubação" continuam.
- `frontend/src/services/pendencias.ts` e `frontend/src/pages/LoginPage.tsx`
  — ver "Achado durante a implementação" abaixo.

**Como funciona:**
- Seletor em destaque no topo: "Apenas Calagem" / "Apenas Adubação" /
  "Calagem + Adubação" (padrão: os dois).
- Os 4 campos que as duas calculadoras têm em comum e com o mesmo
  significado (`identificacao`, `pH_agua`, `MO`, `CTC_pH7`) viram um único
  campo no formulário — preenchido uma vez, usado nos dois cálculos, em vez
  de pedir duas vezes. Isso resolve diretamente o "agrupar para não ficar
  bagunçado" do pedido original.
- Validação: um resolver dinâmico roda o `CalagemSchema` e/ou o
  `AdubacaoSchema` (os mesmos de sempre, sem alteração) conforme o modo
  ativo, e funde os erros dos dois num só. A lógica de negócio (schemas,
  `rotearMetodoCalagem`, motor de cálculo) não foi tocada — só reaproveitada.
- No modo "Ambos", os dois cálculos rodam em paralelo (`/analises/calcular`
  e `/adubacao/calcular`, os mesmos endpoints de sempre) e falha de um não
  derruba o outro — cada card mostra seu próprio resultado ou erro.
- "Salvar" replica o comportamento de cada página original exatamente
  (calagem: gate de login + persistência automática no backend; adubação:
  chamada explícita a `salvarAdubacao`) — ver achado abaixo sobre o
  redirecionamento pós-login.

**Achado durante a implementação (por isso mexi em 2 arquivos fora da tela nova):**
Descobri que "Salvar sem estar logado" guarda o resultado em
`sessionStorage` e, após o login, `services/pendencias.ts` redireciona para
um destino **fixo por tipo** (`/` para calagem, `/adubacao` para adubação —
hardcoded). Sem ajuste, quem clicasse "Salvar" na tela nova sem estar
logado seria devolvido para a tela **antiga** depois do login, perdendo o
resultado combinado. Corrigi isso adicionando um campo opcional `destino`
ao payload salvo (retrocompatível: se ausente, cai no destino de sempre —
testado e confirmado que a página antiga continua indo para `/` sem
mudança nenhuma) e propaguei o tipo do resultado (`tipoRecuperado`) via
`LoginPage.tsx` para a tela nova saber em qual card recolocar o resultado
recuperado.

**Verificação feita:**
- `tsc -b` limpo, `eslint` limpo nos arquivos novos/alterados (2 avisos de
  lint pré-existentes em `pendencias.ts` e no padrão de `AdubacaoPage.tsx`
  não foram tocados — não são deste item).
- Suíte de testes (`vitest run`) — 31/31 passando, sem regressão.
- Testei ao vivo via Docker Compose (backend + Postgres reais) com
  Playwright headless nos 3 modos (Apenas Calagem, Apenas Adubação, Ambos):
  formulário preenche, campos compartilhados aparecem uma única vez com as
  mensagens de reaproveitamento corretas, os dois cálculos batem com os
  valores das páginas originais para os mesmos dados, sem erros de console.
  Testei também o fluxo "Salvar sem login → redireciona para `/login` →
  payload pendente carrega `destino: "/calculadora-completa"`" e confirmei
  que a página antiga (`/`) continua sem esse campo, preservando o destino
  padrão de sempre.

**Validação contra os cenários C1-C9/A1-A8 (2026-09-28):** rodei os 17
cenários de `docs/plano-testes-validacao-agronoma.md` de verdade na tela
nova (mesmos valores de campo das páginas antigas, resposta real da API
capturada via rede). **14/17 bateram exatamente** com os valores
documentados — os 8 de adubação (A1-A8) e 6 dos 9 de calagem (C1-C4, C7,
C9). Os outros 3 (C5, C6, C8) "divergiram" só no campo de referência
`NC_vb`, e não é bug da tela nova: são exatamente ¼ (PD Consolidado) ou ½
(PD Implantação campo natural) do valor documentado — ou seja, o backend
está aplicando corretamente o fator de ajuste em `NC_vb` que foi corrigido
no commit `f6e9c4e` ("fix: corrige NC_vb sem ajuste de fator e trava do PD
Consolidado"), já presente nesta branch. O `plano-testes-validacao-agronoma.md`
ainda documentava os valores de `NC_vb` **de antes** dessa correção para
C5/C6/C8 — ficou desatualizado por essa mudança, não relacionada ao item 2.

**Atualizado em 2026-09-28:** corrigidos os 3 valores de `NC_vb` em
`docs/plano-testes-validacao-agronoma.md` (C5: 2,0→1,0 t/ha; C6:
3,5→0,88 t/ha; C8: 4,5→1,13 t/ha), com nota explicando a correção do
fator de ajuste (commit `f6e9c4e`) e registrando que os 17 cenários foram
revalidados na Calculadora Completa. **Ponto finalizado** — os 17
cenários batem 100% com o documento agora.

**O que ficou de fora (proposital, para manter o escopo no que foi pedido):**
- Os botões de "Cenários de Teste" (C1-C9 / A1-A8) que existem nas páginas
  antigas para validação da agrônoma não foram replicados na tela nova.
  Se quiser, dá para adicionar depois.
- Não mexi nos achados dos itens 1 e 7 (alerta órfão, CPF exposto etc.) —
  ficam como estavam, fora do escopo deste item.

**O que muda:** a tela inicial passa a ter um botão de seleção em
destaque — gerar apenas adubação, apenas calagem, ou os dois — e os
campos exibidos no formulário mudam de acordo, agrupados para não ficar
bagunçado.

**Estado atual (importante para dimensionar o esforço):** hoje calagem e
adubação são páginas **totalmente separadas e independentes**:
`frontend/src/pages/CalculadoraPage.tsx` (rota `/`) e
`frontend/src/pages/AdubacaoPage.tsx` (rota `/adubacao`), com links
próprios e sempre visíveis no `Navbar.tsx:29-36` ("Calagem" / "Adubação").
Não existe nenhum seletor entre elas hoje, nem rudimentar. Os dois
schemas de validação (`frontend/src/schemas/calagemSchema.ts` e
`adubacaoSchema.ts`) são independentes, sem tipo base comum, e os dois
motores de cálculo/endpoints também (`/analises/calcular` vs
`/adubacao/calcular`).

**Arquivos/áreas afetadas:**
- `frontend/src/pages/CalculadoraPage.tsx` e `AdubacaoPage.tsx` — uma
  provavelmente absorve a outra, ou surge uma página nova que compõe as
  duas.
- `frontend/src/App.tsx` — rotas (o que acontece com `/adubacao`: vira
  redirect, deixa de existir, ou os dois convivem?).
- `frontend/src/components/Navbar.tsx:29-36` — hoje tem 2 links
  separados, precisa decidir se viram 1 ou continuam existindo.
- Componentes de formulário **duplicados** hoje entre as duas páginas:
  `CampoNumerico`, `SelectPadrao` e `normalizarNumero` são definidos
  localmente em cada arquivo (`CalculadoraPage.tsx:49-129`,
  `AdubacaoPage.tsx:15-72`) — não há nada compartilhado em
  `frontend/src/components/` hoje.

**Impacto / o que pode quebrar:**
- Links/rotas salvos ou compartilhados apontando para `/adubacao`
  quebram se a rota for removida sem redirect.
- Rodar "os dois" ao mesmo tempo significa validar contra dois schemas
  Zod diferentes e submeter para dois endpoints distintos
  (`/analises/calcular` e `/adubacao/calcular`) — hoje cada página só
  sabe renderizar o resultado do seu próprio motor; a coluna de
  resultado precisaria compor dois resultados lado a lado (ou em abas).
- Sem extrair primeiro os componentes duplicados (`CampoNumerico` etc.),
  unificar as páginas tende a duplicar ainda mais lógica em vez de
  reduzir.

**Alterações necessárias em outras partes do código:**
- Provável pré-requisito técnico: extrair `CampoNumerico`/`SelectPadrao`/
  `normalizarNumero` para `frontend/src/components/` antes de compor as
  duas telas, senão a unificação piora a duplicação existente.
- Decidir o agrupamento de campos: calagem já tem hoje seções fixas
  (`Localização`, `Configuração do Sistema`, `Dados de Solo`, blocos
  condicionais B1/B2/B3, `Monitoramento de Profundidade`) e adubação tem
  outra divisão (`Identificação`, `Grupo A: Análise de Solo`, `Grupo B:
  Cultura e Manejo`) — há campos que se sobrepõem entre os dois
  (`pH_agua`, `MO`, `CTC_pH7` aparecem nos dois formulários) e caberia
  decidir se esses campos compartilhados viram uma seção comum única
  quando "ambos" está selecionado, em vez de pedidos duas vezes.
- Este item toca a mesma área de tela (campos/agrupamento da calculadora
  de calagem) que o item 5 — ver "Dependências entre itens" no topo.

**Decisão / próximos passos:** nenhuma implementação ainda. Ponto em
aberto listado na seção final.

---

### 3. Adubação na Inserção Rápida ("amostras rápidas")

**Status:** em análise — **premissa original não confere com o código atual**
**Data:** 2026-09-28

**Achado importante:** a página de "amostras rápidas" (nome interno
`NovaAnalisePage.tsx`, rota `/dashboard/nova-analise`, título na UI
"Inserção Rápida de Lotes") **já calcula adubação hoje**, não só calagem.
Ela tem um toggle `modo: 'CALAGEM' | 'ADUBACAO'` (`NovaAnalisePage.tsx:135`)
que troca colunas da planilha, configurações globais do lote e o
endpoint de bulk chamado (`postAnalisesBulk` → `/analises/bulk`, ou
`postAdubacaoBulk` → `/adubacao/bulk`) — e em ambos os casos usa o
**mesmo motor real** dos endpoints singulares (`executarMotorCalagem` /
`executarMotorAdubacao`), não é uma versão simplificada do cálculo. A
simplificação está só na UI (planilha em vez de formulário linha a linha).

**O que muda, então:** este item, como descrito, já está feito. O que
falta de fato é a combinação com o item 4 (gerar os dois ao mesmo tempo)
— ver item 4 abaixo, que passa a cobrir na prática o que os itens 3+4
juntos pediam.

**Arquivos envolvidos:** `frontend/src/pages/NovaAnalisePage.tsx` (715
linhas), `backend/src/routes/analisesRoutes.ts:67-114` (bulk calagem),
`backend/src/routes/adubacaoRoutes.ts:94-163` (bulk adubação).

**Decisão / próximos passos:** sugiro fundir este item com o item 4 no
registro (mantenho os dois números por rastreabilidade, mas o trabalho
real é um só — ver item 4).

---

### 4. Inserção Rápida: gerar calagem + adubação juntas (seleção 1 ou ambas)

**Status:** em análise
**Data:** 2026-09-28

**O que muda:** na Inserção Rápida, hoje o toggle é `CALAGEM` OU
`ADUBACAO` (mutuamente exclusivo). Passar a existir uma terceira opção
"ambos", igual ao que o item 2 propõe para a calculadora principal.

**Arquivos/áreas afetadas:**
- `frontend/src/pages/NovaAnalisePage.tsx` — o tipo do estado `modo`
  (linha 135) precisaria virar `'CALAGEM' | 'ADUBACAO' | 'AMBOS'`.
- Colunas da planilha: hoje `COLS_CALAGEM` (linha 93) e `COLS_ADUBACAO`
  (linha 103) são arrays separados, sem lógica de merge — campos que já
  são compartilhados na struct `LinhaAmostra` (ex. `ctc`, `mo`, `ph`)
  ajudam, mas ainda faltaria decidir como a planilha mostra colunas de
  calagem e adubação juntas sem ficar larga/confusa demais.
- `isCellEnabled()` (linha 57) reimplementa as regras condicionais dos
  schemas de calagem e adubação para habilitar/desabilitar células —
  precisaria cobrir o caso combinado.
- `handleSalvarTudo` (linha 252): hoje é um if/else que valida com
  `CalagemSchema.safeParse` OU `AdubacaoSchema.safeParse` e chama um bulk
  OU outro. No modo combinado precisaria validar com os dois schemas e
  chamar os dois bulks para a mesma leva de linhas.
- "Configurações globais do lote" também são exclusivas por modo hoje
  (Sistema de Manejo + PRNT para calagem; Cultura + Rendimento + etc.
  para adubação, linhas 479-562) — no modo combinado as duas listas de
  configuração precisariam conviver na mesma tela.

**Impacto / o que pode quebrar:**
- `frontend/src/pages/NovaAnalisePage.test.ts:79-102` já testa
  especificamente que `isCellEnabled` não bloqueia campo exigido pelo
  `CalagemSchema` — há acoplamento testado entre a lógica de habilitação
  de células e o schema; a mudança precisa manter esse contrato e
  ganhar casos de teste novos para o modo combinado.
- Envio para dois bulks na mesma submissão levanta uma questão de
  consistência: se o bulk de calagem for bem-sucedido e o de adubação
  falhar (ou vice-versa), o que o usuário vê? Hoje isso não existe como
  cenário porque é sempre um OU outro.

**Alterações necessárias em outras partes do código:** nenhuma mudança
de backend parece necessária a princípio — os dois endpoints de bulk já
existem e já funcionam de forma independente; a composição ficaria toda
no frontend. Vale confirmar isso quando for implementar (o levantamento
não teve como testar o comportamento real de concorrência das duas
chamadas).

**Decisão / próximos passos:** nenhuma implementação ainda.

---

### 5. Seleção explícita de método (SMP / Polinomial / Saturação por Bases)

**Status:** em análise — **mudança de modelo maior do que a descrição original sugeria**
**Data:** 2026-09-28

**Achado importante:** hoje **não existem 3 métodos selecionáveis**. O
que existe é:
- Um método **principal, roteado automaticamente** só pelo valor de SMP
  (`rotearMetodoCalagem`, `calculadoraCalagem.ts:69-71`): `SMP > 6.3` →
  Polinomial; senão → SMP. Mutuamente exclusivo, sem input do usuário.
- **Saturação por Bases** (`NC_vb`) não é um método roteável — é um
  cálculo de referência complementar que **só roda quando o método
  roteado é SMP**, e hoje (com `primeira_calagem` fixo em `false`) roda
  **sempre** que o roteado é SMP, nunca junto do Polinomial.

Ou seja: hoje é "1 método roteado automaticamente + 0 ou 1 referência
sempre atrelada a esse roteamento", nunca 3 métodos independentes à
escolha do usuário. Também não existe hoje nenhum alerta de diferença
numérica entre `NC_smp` e `NC_vb` — confirmado por busca no código.

**Campos condicionais hoje** (contexto para o "agrupamento" que a
mudança propõe) — já existe exibição progressiva, mas o gatilho é
sempre um valor calculado, nunca uma escolha do usuário:

| Bloco | Campos | Condição hoje | Onde |
|---|---|---|---|
| B3 Polinomial | `MO`, `Al_trocavel` | `SMP > 6.3` | CalculadoraPage.tsx:658-669 |
| B1 Sat. por Bases (referência) | `V_atual`, `CTC_pH7` | método roteado = SMP (hoje sempre, dado `primeira_calagem=false`) | CalculadoraPage.tsx:671-683 |
| B2 Trava PD Consolidado | `Al_sat` direto ou `Al_trocavel`+`CTC_pH7` | `PD_CONSOLIDADO` e `pH_agua < 5.5` | CalculadoraPage.tsx:685-782 |
| B4 Monitoramento 10-20cm | `pH_agua_10_20`, `Al_sat_10_20`, checkboxes | `PD_CONSOLIDADO` + checkbox manual | CalculadoraPage.tsx:786-867 |

Essa lógica está **triplicada** hoje entre `backend/src/schemas/calagemSchema.ts`
(`.superRefine()`, linhas 122-208), `backend/src/services/calculadoraCalagem.ts::determinarCamposNecessarios`
(linhas 91-143) e `frontend/src/pages/CalculadoraPage.tsx` (flags locais
que replicam a mesma coisa) — já sinalizado como risco de divergência em
`docs/ref-calagem.md:64-69`.

**Arquivos/áreas afetadas pela mudança proposta:**
- `backend/src/schemas/calagemSchema.ts` — precisaria de um campo novo de
  seleção (ex. `metodos_selecionados` ou 2 booleans), e o `.superRefine()`
  passaria a decidir obrigatoriedade de campo pela seleção do usuário em
  vez de `SMP > 6.3`.
- `backend/src/services/calculadoraCalagem.ts` (`rotearMetodoCalagem`,
  `determinarCamposNecessarios`) — deixaria de ser roteamento automático
  excludente para refletir seleção do usuário (possivelmente calculando
  vários métodos em paralelo, o que hoje nunca acontece entre SMP e
  Polinomial).
- `backend/src/services/motorCalagem.ts:166-182,226-228` — o `if/else`
  entre SMP e Polinomial é hoje excludente (`NC_calculada` só recebe um
  dos dois); passaria a precisar calcular cada método marcado e devolver
  todos. Também não existe hoje campo `NC_polinomial` dedicado (o
  polinomial usa `NC_base`/`NC_calculada` genéricos, porque hoje é sempre
  o único método rodado) — precisaria ser criado, análogo a `NC_vb`.
- Novo alerta de divergência: entraria em `backend/src/services/warnings.ts`
  seguindo o padrão existente, mais uma comparação nova em
  `motorCalagem.ts`. **Ponto em aberto:** `NC_vb` hoje não passa pelo
  ajuste de PRNT (só `NC_final`/`NC_ajustada` do método principal
  passam, `motorCalagem.ts:224`) — comparar um valor ajustado com um
  bruto seria inconsistente, precisa decidir contra o quê comparar.
- `frontend/src/schemas/calagemSchema.ts:32-158` — cópia do schema
  precisaria espelhar a mudança do backend (mesmo risco de divergência
  já documentado).
- `frontend/src/pages/CalculadoraPage.tsx` — trocar as condições
  automáticas (`isPolinomial`/`isReaplicacaoSMP`, linhas 314-318) por
  estado controlado por um checkbox novo, exibido só depois dos campos
  base do SMP preenchidos.
- `docs/ref-calagem.md` e `docs/auditoria-calagem-manual-vs-codigo.md` —
  documentam o comportamento atual e ficariam desatualizados após
  qualquer implementação aqui.

**Impacto / o que pode quebrar:**
- A trava do PD Consolidado depende de `V_atual`, hoje coletado por dois
  motivos que estão fundidos (B1 por causa da Sat. por Bases opcional, B2
  por causa da trava). Se a Sat. por Bases virar opcional de verdade, os
  dois motivos de pedir `V_atual` se desacoplam — precisa garantir que a
  trava continue pedindo o campo mesmo se o usuário não marcar "Saturação
  por Bases" (`CalculadoraPage.tsx:695-710` tem um comentário hoje que
  assume que B1 sempre roda junto — deixa de ser verdade).
  Isso está diretamente ligado ao achado 1.1/1.2 já registrado em
  `docs/auditoria-calagem-manual-vs-codigo.md`, então qualquer mudança
  aqui deveria ser checada contra esse documento para não reabrir o bug
  já corrigido.
- Precisa decidir o que fazer quando o usuário não marca Polinomial mas
  `SMP > 6.3` — hoje esse caso nem existe, Polinomial é forçado.

**Alterações necessárias em outras partes do código:** listadas acima
(schema back e front, motor, roteador, warnings, docs de referência).
Este é o item com maior superfície de mudança dos 8.

**Decisão / próximos passos:** nenhuma implementação ainda. Pontos em
aberto na seção final.

---

### 6. Campo de feedback/dicas/erros, visível ao admin

**Status:** implementado
**Data:** 2026-09-28 (implementado em 2026-09-28)

**O que muda:** um campo para o usuário reportar problema/feedback, que
cai numa fila que o admin consegue ver e validar — antes da liberação da
versão inicial para uso real.

**Estado atual:** confirmado por busca no código inteiro (backend e
frontend) — **não existe nenhuma funcionalidade de feedback, ticket ou
"reportar problema" hoje.** Nem tabela, nem rota, nem página, nem
componente.

**Padrão do repo para adicionar uma entidade nova** (seguindo o exemplo
de "Fazendas"): tabela em `backend/src/database/schema.ts` → schema Zod
em `backend/src/schemas/` → camada de dados em `backend/src/database/`
→ rota em `backend/src/routes/` (autenticação via `verificarToken`) →
serviço de negócio se envolver lógica → endpoints de leitura/gestão
adicionados em `adminRoutes.ts` (hoje essa rota só tem `verificarToken +
verificarRole(['ADMIN'])` — mas note: **hoje o admin só lê/lista, não
existe nenhum endpoint de escrita/atualização em `adminRoutes.ts`** — um
"validar feedback" exigiria o primeiro endpoint de escrita do admin) →
serviço de API no frontend (`services/api.ts`) → página de usuário para
abrir o chamado → página admin nova, seguindo o layout das 3 páginas
admin existentes (`AdminDashboardPage`, `AdminUsersPage`, `AdminAnalisesPage`).

**Arquivos/áreas afetadas (se implementado):**
- `backend/src/database/schema.ts` — nova tabela (ex. `feedbacks`):
  `id`, `usuario_id` (nullable, para permitir feedback de convidado),
  `mensagem`, `categoria`/`tipo`, `status` (aberto/em_andamento/resolvido),
  `criado_em`.
- `backend/src/schemas/feedbackSchema.ts` (novo).
- `backend/src/database/feedback.ts` (novo).
- `backend/src/routes/feedbackRoutes.ts` (novo) — POST para criar, GET
  para o usuário ver os seus.
- `backend/src/routes/adminRoutes.ts` — novo `GET /admin/feedbacks` e
  provavelmente `PATCH /admin/feedbacks/:id` (primeiro endpoint de
  escrita do admin no sistema).
- `frontend/src/pages/AdminFeedbackPage.tsx` (novo).
- Algum ponto de entrada visível na UI do usuário para abrir o campo
  (rodapé, botão flutuante, item de menu — a decidir).

**Decisões do usuário para manter simples (resolvem os pontos em aberto
acima):** sem conceito de categoria/tipo, sem status (aberto/resolvido),
sem `usuario_id` — qualquer pessoa envia, sem precisar estar logada, e o
admin só visualiza (nenhum fluxo de escrita/resposta). Campos pedidos:
nome (obrigatório), telefone (obrigatório), UF + cidade (obrigatórios),
e-mail (opcional), descrição do problema (obrigatória).

**O que foi implementado:**
- `backend/src/database/schema.ts` — tabela `feedbacks`: `id`, `nome`,
  `telefone`, `uf`, `cidade`, `email` (nullable), `descricao`,
  `criado_em`. Migration gerada em `backend/drizzle/0004_add_feedbacks_table.sql`
  e aplicada direto via SQL no banco de dev (evitei `drizzle-kit push`
  porque ele também tentava apagar uma coluna antiga não relacionada,
  `sistema_efetivo`, com 86 registros — divergência preexistente entre
  schema e banco, fora do escopo deste item, não mexi nela).
- `backend/src/schemas/feedbackSchema.ts` — validação Zod (nome, telefone,
  descrição obrigatórios; UF com 2 letras; e-mail opcional mas validado
  se preenchido).
- `backend/src/database/feedback.ts` — `createFeedback`/`getAllFeedbacks`.
- `backend/src/routes/feedbackRoutes.ts` — `POST /api/feedback`, **sem**
  `verificarToken` (rota pública, de propósito).
- `backend/src/routes/adminRoutes.ts` — `GET /admin/feedbacks` (dentro do
  bloco que já exige `verificarToken + verificarRole(['ADMIN'])`).
- `frontend/src/schemas/feedbackSchema.ts`, `frontend/src/services/api.ts`
  (`postFeedback`, `getFeedbacksAdmin`).
- `frontend/src/pages/FeedbackPage.tsx` (nova, rota pública `/feedback`,
  sem `ProtectedRoute`) — formulário simples, reaproveitando o mesmo
  seletor UF/cidade via IBGE já usado nas calculadoras.
- `frontend/src/pages/AdminFeedbackPage.tsx` (nova, rota `/admin/feedback`,
  dentro do bloco protegido por `roles={['ADMIN']}`) — lista simples em
  cards (nome, telefone, e-mail se houver, cidade/UF, data, descrição),
  com busca por texto. Sem paginação nem drill-down — não há necessidade
  ainda dado o volume esperado.
- `frontend/src/components/Navbar.tsx` — link público "Feedback".
- `frontend/src/layouts/DashboardLayout.tsx` — item "Feedback" no menu
  lateral do admin.

**Verificação feita:** `tsc` limpo (backend e frontend), `eslint` limpo
nos arquivos novos, `vitest run` sem regressão (31/31). Testado ao vivo
via Docker Compose + Playwright: enviei um feedback sem estar logado,
confirmei o `POST /api/feedback` retornando 201 e a tela de confirmação,
depois logei como admin e confirmei que o feedback aparece em
`/admin/feedback` com todos os campos corretos.

---

### 7. Levantamento de dados sensíveis coletados / LGPD

**Status:** em análise — achados de risco documentados abaixo
**Data:** 2026-09-28

**O que muda:** nada de código por enquanto — é um levantamento para
decisão, dado que o sistema está perto de ser liberado para uso real.

**Levantamento completo, por tabela (`backend/src/database/schema.ts`, 5 tabelas):**

- **`users`**: `nome` (pessoal), **`cpf`** (pessoal sensível — `text().notNull().unique()`,
  obrigatório, sem mascaramento no banco), `email` (pessoal), `senha`
  (hash bcrypt, confirmado — não é texto puro), `cidade`/`estado`
  (localização, granularidade município — ok), `telefone` (pessoal,
  **opcional**), `role`, `createdAt`.
- **`analises`** (calagem): sem dado pessoal direto, exceto `identificacao`
  (texto livre opcional — usuário pode digitar qualquer coisa ali,
  inclusive nome próprio, sem validação de conteúdo) e a FK lógica
  `usuario_id`. Resto é dado agronômico (pH, SMP, doses calculadas etc.).
- **`fazendas`**: `nome` da fazenda, `municipio`/`uf` — sem endereço
  completo nem coordenadas.
- **`talhoes`**: `nome`, `cultura` — nenhum dado pessoal.
- **`analises_adubacao`**: mesmo padrão de `analises` — `identificacao`
  livre + dados agronômicos, sem dado pessoal direto.

**Confirmado por grep dedicado:** **não existe** CEP, endereço completo,
rua, nem latitude/longitude/coordenadas GPS em nenhuma tabela ou arquivo
do repo. A granularidade de localização coletada é sempre
município/UF — isso já está minimizado.

**Riscos identificados, em ordem de prioridade:**

1. **CPF obrigatório e único** para todo cadastro de usuário
   (`schema.ts:22`, `authSchema.ts:5` exige exatamente 11 dígitos) — um
   app de recomendação agronômica não parece precisar de CPF para
   funcionar (calcular calagem/adubação não depende disso). Coletar CPF
   completo, obrigatório, de todo usuário é uma superfície de dado
   sensível maior do que a finalidade declarada do app parece exigir —
   vale reavaliar se é necessário sempre, ou só em algum fluxo
   específico (nota fiscal, contrato comercial).
2. **CPF exposto em bulk e em texto puro** no endpoint
   `GET /api/admin/users` (`adminRoutes.ts:82-128`) — devolve o CPF de
   **todos** os usuários de uma vez para qualquer ADMIN, e o frontend
   (`AdminUsersPage.tsx:94,130`) guarda essa lista em estado React e usa
   até para busca client-side (`u.cpf.includes(busca)`). Não é bug, é
   intencional, mas é dado sensível trafegando e ficando em memória do
   navegador sem necessidade aparente de mostrar o CPF completo na
   listagem — poderia ser mascarado (ex. `***.***.**9-00`) e só
   aparecer completo no drill-down, se realmente precisar lá.
3. **Telefone** é opcional, risco baixo relativo.
4. **Sem coleta de endereço completo ou GPS** — ponto positivo, não
   precisa de ação.
5. **Senha corretamente hasheada com bcrypt** (`authRoutes.ts:37,85`) —
   confirmado que nenhuma rota retorna o hash em resposta JSON (checado
   nos 5 usos de `.from(users)` no backend). Sem vazamento identificado
   aqui.
6. Observação correlata (segurança, não LGPD estritamente): JWT com
   validade de 7 dias guardado em `localStorage`
   (`AuthContext.tsx:73,89`) — suscetível a XSS. Fora do escopo deste
   item, mas relevante para o levantamento de risco geral antes de
   liberar para uso.
7. **Não existe rota de exclusão de conta** hoje, nem cascade delete
   real no Postgres (as FKs são "lógicas", não constraints reais) — se
   a LGPD exigir direito ao esquecimento, isso hoje não é atendível sem
   trabalho manual no banco.

**Impacto / o que pode quebrar:** nenhuma mudança de código foi feita.
Se decidir agir sobre os achados (tornar CPF opcional, mascarar CPF no
admin, adicionar exclusão de conta), cada uma dessas seria uma alteração
separada, com seu próprio mapeamento de impacto quando chegar a vez.

**Alterações necessárias em outras partes do código:** nenhuma agora —
é levantamento. Caso decida agir: `backend/src/schemas/authSchema.ts`
(tornar `cpf` opcional), `backend/src/database/schema.ts` (idem na
coluna), `backend/src/routes/adminRoutes.ts` + `AdminUsersPage.tsx`
(mascarar CPF na listagem), e uma rota nova de exclusão de conta
(afetaria `authRoutes.ts` e todas as tabelas com `usuario_id`).

**Decisão / próximos passos:** pontos 1 e 2 acima estão na seção final
para sua validação — são os que mais parecem exigir uma decisão antes
do lançamento.

---

### 8. Bug no cálculo de adubação em cenário específico

**Status:** aguardando detalhes do usuário
**Data:** 2026-09-28

**O que muda:** a definir — você vai descrever o cenário específico em
que o cálculo de adubação está errado.

**Próximos passos:** assim que você passar o cenário, mapeio a causa em
`backend/src/services/motorAdubacao.ts`/`calculadoraAdubacao.ts`/
`tabelasAdubacaoGraos.ts` e registro aqui: o que está errado, por que,
o que mais depende daquele trecho (testes existentes, outros cálculos
que reaproveitam a mesma função) antes de qualquer correção.

---

## Pontos que preciso verificar com você

1. **Item 1 (alertas):** `MSG_AVALIACAO_AGRONOMICA` é código morto no
   backend — a função que a gera nunca é chamada por nenhuma rota; o que
   o usuário vê hoje é uma cópia hardcoded no frontend, calculada no
   cliente. Quer que eu trate isso como um bug a corrigir (conectar a
   função real, ou remover o código morto e manter só a versão
   frontend) em um item separado, ou deixo só documentado por agora?
   Também: alertas de **adubação** não aparecem no histórico, no modal
   de detalhes nem nas telas de admin (só no resultado imediato e no
   PDF) — isso é intencional ou é um gap a corrigir depois?

2. ~~**Item 2 (unificar calculadora):**~~ **Resolvido e implementado** —
   criei uma tela nova (`/calculadora-completa`) em vez de alterar `/` e
   `/adubacao`; as duas continuam existindo como backup, sem redirect.
   Ver detalhes na seção do item 2 acima.

3. **Item 3 (adubação na Inserção Rápida):** a premissa original era
   "hoje só faz calagem", mas o código já calcula os dois via um toggle
   exclusivo. Confirma que o real pedido é só a terceira opção "ambos"
   (fundido com o item 4), ou tinha algo mais específico em mente que eu
   não capturei?

4. **Item 5 (seleção de método):** este é o item de maior impacto dos 8
   — hoje SMP e Polinomial são **mutuamente exclusivos** (decididos
   automaticamente pelo valor de SMP), nunca calculados junto. A mudança
   pedida implica: (a) permitir calcular os dois ao mesmo tempo quando o
   usuário marcar ambos, (b) decidir o que acontece quando `SMP > 6.3`
   mas o usuário NÃO marca Polinomial (hoje esse caso não existe — é
   forçado), e (c) contra qual valor comparar `NC_vb` no novo alerta de
   divergência, já que hoje `NC_vb` não passa pelo ajuste de PRNT e o
   `NC_final` do método principal passa — comparar os dois brutos seria
   inconsistente. Confirma que é isso mesmo que você tinha em mente, ou
   a ideia era mais simples do que essa reestruturação?

5. **Item 7 (LGPD):** CPF é hoje obrigatório para todo cadastro e
   aparece em texto puro, em bulk, na listagem de admin. Isso é algo que
   você quer endereçar antes de liberar a versão inicial (tornar
   opcional / mascarar no admin), ou por ora só registrar o risco e
   decidir depois?

6. **Item 8:** aguardando você descrever o cenário do bug de adubação
   para eu mapear o impacto.

7. ~~**Doc de teste desatualizado (achado ao validar o item 2):**~~
   **Resolvido em 2026-09-28** — `docs/plano-testes-validacao-agronoma.md`
   atualizado (C5, C6, C8) e os 17 cenários revalidados batendo 100% na
   Calculadora Completa. Pronto para reenviar à coordenadora.
