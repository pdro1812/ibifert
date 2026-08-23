# Referência Técnica — Cálculo de Calagem

> Especificação de como o cálculo funciona hoje no código. Não é relato de
> auditoria — achados de bug/segurança ficam em `docs/02-calculo-calagem.md`,
> com referência de volta às seções daqui.
>
> A trava da seção 6 (§6.3) já teve um bug de lógica corrigido em
> `backend/src/services/motorCalagem.ts` (commit `7ae0c50`, 2026-08-22) —
> a especificação abaixo já descreve o comportamento **atual e correto**.

---

## 1. Visão geral

O motor de calagem calcula a **Necessidade de Calcário (NC)**, em t/ha, para
corrigir a acidez do solo, a partir de uma análise de solo e do sistema de
manejo do talhão (convencional, plantio direto em implantação, consolidado,
ou consolidado com restrição). O resultado inclui a dose, o modo de aplicação
(incorporado ou superficial), a profundidade, e alertas/travas agronômicas.

```
Frontend (CalculadoraPage) → POST /api/analises
  → schemas/calagemSchema.ts (validação)
  → services/motorCalagem.ts::executarMotorCalagem()
      ├─ services/calculadoraCalagem.ts  (fórmulas puras)
      └─ services/tabelaSmp.ts           (lookup Tabela 5.2)
  → database/analises.ts::salvarAnalise() (persistência)
```

Fonte agronômica: **Manual de Calagem e Adubação para os Estados do RS e
SC (2016)**, Capítulo 5 (Tabela 5.2 — Necessidade de Calcário pelo método
SMP) e a spec derivada `docs_antigos/regras_calagem_graos_v2.md`.

Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `backend/src/schemas/calagemSchema.ts` | Validação de entrada (zod) + tipos + enums |
| `backend/src/services/motorCalagem.ts` | Orquestração: travas, roteamento, montagem do resultado |
| `backend/src/services/calculadoraCalagem.ts` | Fórmulas puras (sem decisão de fluxo) |
| `backend/src/services/tabelaSmp.ts` | Tabela 5.2 do manual (lookup) |
| `backend/src/services/warnings.ts` | Textos de alerta/nota técnica |
| `backend/src/database/analises.ts` | Persistência do resultado |

---

## 2. Dados de entrada (`CalagemSchema`)

| Campo | Sempre obrigatório? | Obrigatório quando... | Faixa válida |
|---|---|---|---|
| `sistema_manejo` | sim | — | `CONVENCIONAL` \| `PD_IMPLANTACAO` \| `PD_CONSOLIDADO` \| `PD_COM_RESTRICAO`* |
| `primeira_calagem` | sim | — | boolean |
| `pH_agua` | sim | — | 3.5 – 8.0 |
| `SMP` | sim | — | número (sem faixa fixa) |
| `PRNT` | sim | — | > 0 e ≤ 100 |
| `MO` (matéria orgânica) | não | `SMP > 6.3` (método Polinomial) | 0 – 100 |
| `Al_trocavel` | não | `SMP > 6.3`, ou PD_CONSOLIDADO+pH<5.5 sem Al_sat direto | ≥ 0 |
| `V_atual` | não | reaplicação (`primeira_calagem=false`) + método SMP | 0 – 100 |
| `CTC_pH7` | não | reaplicação + método SMP; ou PD_CONSOLIDADO+pH<5.5 sem Al_sat direto | > 0 |
| `Al_sat` | não | PD_CONSOLIDADO com `pH_agua < 5.5` (alternativa a Al_trocavel+CTC_pH7) | 0 – 100 |
| `SMP_10_20` | não | `PD_COM_RESTRICAO` | número |
| `Al_sat_10_20` | não | `PD_COM_RESTRICAO` (direto ou via `monitoramento.Al_sat_10_20`) | 0 – 100 |
| `opcao_superficial_campo_natural` | não | só relevante em `PD_IMPLANTACAO` | boolean |
| `monitoramento` | não | fluxo de reavaliação 10-20cm (ver §6) | objeto `Monitoramento10_20Schema` |
| `identificacao` | não | livre, só rótulo | string |

`*` `PD_COM_RESTRICAO` **não é um valor que o formulário oferece ao usuário**
— é um estado interno atingido via `avaliarMonitoramento10_20()` (§6). O
enum existe no schema para permitir que o motor seja chamado internamente
com esse valor, mas a UI só expõe os outros três.

A obrigatoriedade condicional é reforçada em dois lugares que precisam
ficar sincronizados: o `.superRefine()` do `CalagemSchema` (validação dura,
rejeita a requisição) e `determinarCamposNecessarios()` em
`calculadoraCalagem.ts` (usado pelo frontend para saber quais campos exibir
*antes* de validar). Se um dia divergirem, o front pode esconder um campo
que o backend exige — checar os dois ao alterar regra de obrigatoriedade.

---

## 3. Fluxo de decisão

```
entrada validada
  │
  ├─ roteamento do método: SMP > 6.3 ? POLINOMIAL : SMP        (rotearMetodoCalagem)
  │
  ├─ CONVENCIONAL ou PD_IMPLANTACAO?
  │     └─ pH_agua >= 5.5 → PARA AQUI, não aplicar calcário
  │
  ├─ PD_CONSOLIDADO?
  │     ├─ pH_agua >= 5.5 → PARA AQUI, não aplicar
  │     └─ pH_agua < 5.5 e V_atual>=65% e Al_sat<10% → PARA AQUI, trava (⚠️ ver aviso §6.3)
  │
  ├─ PD_COM_RESTRICAO?
  │     └─ NÃO (pH_10_20 < 5.5 E Al_sat_10_20 >= 30%) → PARA AQUI, não reiniciar PD
  │
  │  (nenhuma trava disparou — segue para o cálculo)
  │
  ├─ SMP <= 6.3 → lookup Tabela 5.2 (tabelaSmpLookup) → NC_base
  │     └─ reaplicação? calcula também NC_vb (saturação por bases), em paralelo
  ├─ SMP > 6.3  → fórmula Polinomial (MO, Al_trocavel) → NC_base
  │
  ├─ aplica fator de manejo (1.0 ou 0.25) → NC_calculada
  │
  ├─ ajustes por sistema de manejo:
  │     CONVENCIONAL        → incorporado, 20cm
  │     PD_IMPLANTACAO      → incorporado 20cm, OU superficial com dose*0.5 se opção marcada e SMP>5.5
  │     PD_CONSOLIDADO      → superficial, trava em 5.0 t/ha se ultrapassar
  │     PD_COM_RESTRICAO    → incorporado 20cm, marca acao_requerida=REINICIAR_PLANTIO_DIRETO
  │
  └─ ajuste final por PRNT → NC_ajustada (resultado exibido ao usuário)
```

---

## 4. Fórmulas

### 4.1 Necessidade de Calcário — Método Polinomial (SMP > 6.3, pH-alvo 6.0)

```
NC_base = -0.516 + 0.805 * MO + 2.435 * Al_trocavel      (mínimo 0)
```
- Aplica-se quando `SMP > 6.3`.
- Fonte: `calculadoraCalagem.ts:34-40` (`calcularNCPolinomial6_0`).
- Exemplo: `MO = 3.0`, `Al_trocavel = 1.5` → `NC_base = -0.516 + 2.415 + 3.6525 = 5.55` t/ha.

### 4.2 Necessidade de Calcário — Método SMP (SMP ≤ 6.3)

Não é fórmula, é **lookup direto** na Tabela 5.2 (`tabelaSmp.ts`), sem
interpolação:
- `SMP` é arredondado para baixo (`floor`) na 1ª casa decimal (5.85 → 5.8).
- `SMP < 4.4` → usa a linha de 4.4 (maior dose da tabela).
- `SMP > 7.1` → `NC_base = 0`.
- pH-alvo usado sempre é **6.0** neste motor (a tabela tem colunas para
  5.5 e 6.5 também, mas não são usadas por `motorCalagem.ts` — ver nota
  em §6.5 e achado 02§6.2).
- Fonte: `tabelaSmp.ts:50-70` (`tabelaSmpLookup`).
- Exemplo: `SMP = 5.6` → linha `smp:5.6, pH_6_0: 5.4` → `NC_base = 5.4` t/ha.

### 4.3 Saturação por Bases — NC_vb (só reaplicação, método SMP)

Calculada **em paralelo** ao NC_base/NC_smp quando `primeira_calagem=false`
e o método roteado é SMP — é uma segunda referência, não substitui a
principal (o resultado final continua vindo do método SMP; `NC_vb` é
informativo, para o técnico comparar).

```
V_desejada = 75%
  se CTC_pH7 < 7.5  → V_desejada -= 5   (→ 70%)
  se CTC_pH7 > 15.0 → V_desejada += 5   (→ 80%)

NC_vb = ((V_desejada - V_atual) / 100) * CTC_pH7        (mínimo 0)
```
- Fonte: `calculadoraCalagem.ts:42-55` (`calcularNCVB`).
- Exemplo: `CTC_pH7 = 10`, `V_atual = 50` → `V_desejada=75` →
  `NC_vb = ((75-50)/100)*10 = 2.5` t/ha.

### 4.4 Fator de manejo

```
NC_calculada = NC_base * fator_manejo
```
| `sistema_manejo` | `fator_manejo` |
|---|---|
| `CONVENCIONAL` | 1.0 |
| `PD_IMPLANTACAO` | 1.0 (padrão) |
| `PD_CONSOLIDADO` | 0.25 |
| `PD_COM_RESTRICAO` | 1.0 |

- Fonte: `motorCalagem.ts:149-152`.

### 4.5 Caso especial — `PD_IMPLANTACAO` superficial em campo natural

Quando `opcao_superficial_campo_natural = true` **e** `SMP > 5.5`, a dose
não usa o fator de manejo acima — é recalculada direto como:
```
NC_final = tabelaSmpLookup(SMP, 6.0) * 0.5
```
- Fonte: `motorCalagem.ts:189-196`.
- Exemplo: `SMP = 5.8` → tabela dá `4.2` → `NC_final = 2.1` t/ha, aplicação
  superficial (sem profundidade de incorporação).

### 4.6 Trava de 5 t/ha — `PD_CONSOLIDADO`

```
se NC_calculada > 5.0 → NC_final = 5.0  (+ alerta MSG_LIMITE_SUPERFICIAL_PD)
senão                 → NC_final = NC_calculada
```
- Fonte: `motorCalagem.ts:199-207`.
- Motivo agronômico: dose maior que 5 t/ha aplicada em superfície (sem
  incorporação) no PD Consolidado não é eficaz/segura — precisa reaplicação
  parcelada.

### 4.7 Ajuste final por PRNT

```
NC_ajustada = NC_final * (100 / PRNT)
```
- Aplicado sempre, por último, sobre o `NC_final` já definido pelas regras
  acima.
- `PRNT` fora de `(0, 100]` → erro de validação (`CalagemValidationError`),
  não chega a calcular.
- Fonte: `calculadoraCalagem.ts:57-65` (`ajustarDosePorPRNT`).
- Exemplo: `NC_final = 5.0`, `PRNT = 80` → `NC_ajustada = 5.0 * 1.25 = 6.25` t/ha.

---

## 5. Tabelas de referência

### 5.1 Tabela 5.2 (SMP → NC_base pelo pH-alvo)

Reproduzida por completo em `backend/src/services/tabelaSmp.ts:10-39` —
28 linhas, SMP de 4.4 a 7.1, incremento de 0.1. Três colunas de pH-alvo
(5.5 / 6.0 / 6.5), mas **só a coluna 6.0 é usada hoje** pelo motor
(§4.2, §4.5). Conferir linha a linha contra o Capítulo 5 do manual PDF
caso surjam dúvidas sobre um valor específico — é transcrição direta,
não fórmula.

### 5.2 Fator de manejo por sistema

Já coberta em §4.4 — não há tabela adicional além dessa.

---

## 6. Travas e casos especiais

Lista fechada das situações em que o motor decide **não** recomendar
calagem (retorno antecipado, `aplicar_calcario: false`, `NC_final: 0`):

| # | Sistema de manejo | Condição de disparo | Mensagem |
|---|---|---|---|
| 6.1 | `CONVENCIONAL` / `PD_IMPLANTACAO` | `pH_agua >= 5.5` | `MSG_SEM_NECESSIDADE_CALAGEM` |
| 6.2 | `PD_CONSOLIDADO` | `pH_agua >= 5.5` | `MSG_SEM_NECESSIDADE_CALAGEM` |
| 6.3 | `PD_CONSOLIDADO` | `pH_agua < 5.5` **e** `V_atual >= 65%` **e** `Al_sat < 10%` ("solo tamponado") | `MSG_TRAVA_PD_CONSOLIDADO` |
| 6.4 | `PD_COM_RESTRICAO` | critérios de restrição **não** confirmados (`pH_10_20 < 5.5 AND Al_sat_10_20 >= 30%` é falso) | `MSG_SEM_REINICIO_PD` |

> **Corrigido em 2026-08-22 (commit `7ae0c50`)**: a condição implementada em
> `motorCalagem.ts:113-118` tinha uma checagem redundante (`pH_agua >= 5.5
> &&`) que nunca era alcançável, porque um `if (pH_agua >= 5.5)` anterior já
> retornava antes — a trava nunca disparava em nenhum cenário. A correção
> removeu essa checagem redundante; a condição hoje é exatamente a
> descrita na tabela acima. `npm test` confirma 20/20 (antes: 19/20,
> `CT-06` falhava). Histórico completo em `docs/02-calculo-calagem.md §6.0`.

Cada trava retorna um objeto padronizado (`criarResultadoNaoAplicar`) com
`NC_base/NC_smp/NC_final/NC_ajustada` todos zerados e a mensagem
correspondente em `alertas`.

---

## 7. Saída e persistência

### 7.1 Formato retornado por `executarMotorCalagem()` (`ResultadoCalagem`)

| Campo | Tipo | Sempre presente? | Descrição |
|---|---|---|---|
| `aplicar_calcario` | boolean | sim | `false` se alguma trava da §6 disparou; `true` caso contrário |
| `metodo_calc_roteado` | `"SMP"` \| `"POLINOMIAL"` | sim | qual método foi roteado a partir do SMP (§3) — presente mesmo quando `aplicar_calcario=false` |
| `calcular_tambem_sat_bases` | boolean | sim | `true` quando é reaplicação + método SMP (indica se `NC_vb` deveria vir preenchido) |
| `NC_base` | number | sim | dose bruta antes de fator de manejo/travas/PRNT (0 se trava disparou) |
| `NC_smp` | number \| undefined | só quando método=SMP e sem trava | `NC_base * fator_manejo`, antes dos ajustes de §4.5/§4.6 |
| `NC_vb` | number \| undefined | só quando `calcular_tambem_sat_bases=true` e sem trava | ver §4.3 — referência paralela, não é o valor usado como `NC_final` |
| `NC_final` | number | sim | dose já com fator de manejo + ajustes de sistema (§4.4-4.6), **antes** do PRNT |
| `NC_ajustada` | number | sim | **valor final a exibir/aplicar** — `NC_final` corrigido por PRNT (§4.7) |
| `fator_manejo` | number | sim | 1.0 ou 0.25, conforme §4.4 |
| `modo_aplicacao` | `"INCORPORADO"` \| `"SUPERFICIAL"` | sim | como o calcário deve ser aplicado |
| `profundidade_cm` | number \| undefined | só quando `modo_aplicacao=INCORPORADO` | sempre `20` quando presente |
| `acao_requerida` | `"REINICIAR_PLANTIO_DIRETO"` \| undefined | só em `PD_COM_RESTRICAO` com trava confirmada | sinaliza que o talhão deve voltar a incorporar calcário antes de reiniciar o PD |
| `alertas` | string[] | sim (pode ser vazio) | mensagens acumuladas — trava (§6), limite de 5 t/ha (§4.6), ou nenhuma se tudo dentro do esperado |
| `nota_tecnica` | string \| undefined | só quando `calcular_tambem_sat_bases=true` | texto fixo `MSG_NOTA_REAPLICACAO`, avisando que a escolha entre `NC_smp` e `NC_vb` é do técnico |
| `campos_necessarios` | string[] | sim | eco de `determinarCamposNecessarios()` — mesma lista que o frontend usaria para montar o formulário; útil para debugar "por que o front pediu esse campo" |

**Regra de leitura importante**: quando uma trava da §6 dispara, o objeto
inteiro vem com `NC_base/NC_smp/NC_final/NC_ajustada = 0` e só `alertas`
carrega informação — **não confundir "dose zero calculada" com "trava
disparada"**: ambas têm `NC_ajustada: 0`, mas só a trava tem
`aplicar_calcario: false`. Ao investigar um resultado, sempre olhar
`aplicar_calcario` primeiro.

### 7.2 O que é persistido (tabela `analises`, via `salvarAnalise()`)

Grava **entrada bruta + resultado completo**, tornando o histórico
auto-suficiente (reproduzível sem depender do motor atual):

- Toda a entrada validada: `sistema_manejo` (com a conversão descrita
  abaixo), `primeira_calagem`, `PRNT`, `opcao_superficial_campo_natural`,
  `pH_agua`, `SMP`, `MO`, `Al_trocavel`, `V_atual`, `CTC_pH7`, `Al_sat`,
  `modo_al_sat` (se veio direto ou calculado), os 5 campos de
  `monitoramento_*`, `SMP_10_20`.
- Todo o resultado: `aplicar_calcario`, `NC_base`, `NC_final`,
  `NC_ajustada`, `NC_vb`, `metodo_calc_roteado`, `modo_aplicacao`,
  `profundidade_cm`, `nota_tecnica`, `acao_requerida`, `alertas` (array).
- **Não é gravado**: `NC_smp` (existe no retorno da função mas não tem
  coluna própria — se for `PD_COM_RESTRICAO`/reaplicação, o valor
  intermediário `NC_smp` se perde após o salvamento; só `NC_final` e
  `NC_ajustada` sobrevivem) e `campos_necessarios` (é metadado de
  formulário, não faz sentido persistir).
- **Conversão na gravação**: se `entrada.sistema_manejo ===
  'PD_COM_RESTRICAO'`, o valor salvo em `sistema_manejo` vira
  `'PD_CONSOLIDADO'` (`analises.ts:31-33`) — porque `PD_COM_RESTRICAO` é
  estado interno do motor (§2) e a coluna do banco só aceita os 3 valores
  que o formulário realmente oferece. Ou seja: **olhando só a tabela
  `analises`, não dá pra saber se um registro `PD_CONSOLIDADO` passou ou
  não pela reavaliação de restrição** — essa informação só existe nos
  campos `monitoramento_*` (se vieram preenchidos).

---

## 8. Como usar este documento para investigar um resultado suspeito

1. **Confirme os dados de entrada reais** que geraram o resultado (na
   tabela `analises` ou no payload da requisição): `sistema_manejo`, `SMP`,
   `pH_agua`, e os campos condicionais relevantes.
2. **Siga a árvore da §3** manualmente com esses valores — qual trava
   (§6) ou qual caminho de cálculo (§4) deveria ter sido seguido?
   - Se caiu em `PD_CONSOLIDADO` com `pH_agua < 5.5`, `V_atual >= 65%` e
     `Al_sat < 10%`: a trava 6.3 deve disparar (`aplicar_calcario: false`)
     desde a correção de 2026-08-22. Se um resultado real não bateu com
     isso, confirme primeiro que o ambiente/deploy consultado já está
     rodando código pós-`7ae0c50` antes de tratar como bug novo.
3. **Refaça a fórmula correspondente à mão** (§4) com os mesmos números.
   - Bateu com o que o sistema retornou? A causa provável é dado de
     entrada incorreto/incompleto, não lógica.
   - Não bateu? Comparar passo a passo com o código-fonte citado em cada
     fórmula (`arquivo.ts:linha`) — divergência de lógica, reportar
     junto com o caso de teste específico (igual ao formato usado em
     `docs/02-calculo-calagem.md §6.0`).
4. **Cuidado com `NC_smp` não persistido** (§7.2): se o caso é de
   reaplicação e você está tentando reconstruir "por que essa dose e não
   a da saturação por bases", o `NC_vb` fica salvo mas o `NC_smp`
   intermediário, não — pegue o valor bruto rodando a fórmula de novo
   (§4.2) em vez de procurar na tabela.

---

## 9. Blocos condicionais na tela (`CalculadoraPage.tsx`, frontend)

A tela de cálculo (`frontend/src/pages/CalculadoraPage.tsx`) não pede todos
os campos condicionais da §2 de uma vez — ela libera "blocos" extras
conforme o que já foi respondido, para não pedir dado agronômico sem
necessidade. Os blocos são nomeados literalmente assim no JSX (título
visível na tela) e espelham a spec `docs_antigos/regras_calagem_graos_v2.md`
(seções B1–B4).

| Bloco | Campos pedidos | Condição de exibição | Fonte (frontend) |
|---|---|---|---|
| **B1** — Saturação por Bases | `V_atual`, `CTC_pH7` | `primeira_calagem === false` **e** método roteado = `SMP` (`SMP <= 6.3`) — independente do `sistema_manejo` | `CalculadoraPage.tsx:527-539`, condição `isReaplicacaoSMP` (linha 195) |
| **B2** — Trava do PD Consolidado | `Al_sat` (direto, ou via `Al_trocavel`+`CTC_pH7`); `V_atual` também, mas só se além disso for reaplicação | `sistema_manejo === 'PD_CONSOLIDADO'` **e** `pH_agua < 5.5` | `CalculadoraPage.tsx:541-640`, condição `precisaAlSat` (linha 198) |
| **B3** — Método Polinomial | `MO`, `Al_trocavel` | método roteado = `POLINOMIAL` (`SMP > 6.3`) | `CalculadoraPage.tsx:513-525`, condição `isPolinomial` (linha 194) |
| **B4** — Monitoramento 10–20cm | `SMP_10_20`, `Al_sat_10_20` (ou via `monitoramento`) | exclusivo do `PD_CONSOLIDADO`, fluxo de reavaliação para `PD_COM_RESTRICAO` (ver §2, nota sobre `PD_COM_RESTRICAO`) | `CalculadoraPage.tsx:643+` |

Pontos que geram confusão ao investigar um caso relatado pelo usuário:

- **B1 nunca aparece em primeira calagem**, e nunca aparece se o método
  roteado for Polinomial (`SMP > 6.3`) — mesmo em reaplicação. Ou seja,
  `SMP > 6.3` desliga B1 completamente, independente de `primeira_calagem`.
- **B1 e B3 não se relacionam com `sistema_manejo`** — dependem só de
  `primeira_calagem` e do `SMP`. Já **B2 depende só de `sistema_manejo` e
  `pH_agua`** — os três blocos podem aparecer em qualquer combinação entre
  si (ex.: B2+B3 juntos, em PD Consolidado com SMP alto e pH baixo).
- Dentro do B2, o campo `V_atual` **não** é sempre pedido — só quando,
  além do PD Consolidado com pH baixo, a calagem também for reaplicação
  (é o mesmo `V_atual` que alimenta a trava §6.3). Em primeira calagem, B2
  pede só `Al_sat`.

> **Bug corrigido em 2026-08-23**: os selects "Tipo de Aplicação"
> (`primeira_calagem`) e "Modo de Aplicação" (`opcao_superficial_campo_natural`)
> usavam `setValueAs: (v) => v === 'true'`. O React Hook Form aplica essa
> mesma transformação também sobre o **valor padrão** do campo — que já
> chega como booleano (`true`), não como string. Como `true === 'true'` é
> `false` em JavaScript, o campo "Primeira calagem" virava internamente
> `false` (Reaplicação) assim que a tela montava, **mesmo sem o usuário
> tocar no select** — liberando o Bloco B1 indevidamente em primeira
> calagem (relatado pelo usuário como "PD Implantação + Primeira calagem +
> SMP=4 abre o Bloco B1", quando a regra diz que não deveria). A correção
> trocou a checagem para `v === true || v === 'true'`, aceitando tanto o
> valor padrão booleano quanto a string vinda da interação do usuário no
> DOM. Guardado por teste automatizado (ver §9.1).

### 9.1 Cobertura de teste (Playwright)

`frontend/e2e/calculadora-blocos.spec.ts` roda uma matriz combinatória
(3 sistemas de manejo × primeira/reaplicação × SMP baixo/alto × pH
baixo/alto = 24 casos) comparando os blocos exibidos contra a regra desta
seção, escrita independente do código-fonte da tela — se a implementação
um dia divergir da regra, o teste falha. Há também um teste de regressão
dedicado ao bug acima (`"sem tocar nos selects..."`), que reproduz o
caminho exato que expôs o defeito: preencher pH/SMP sem nunca interagir
com os selects de sistema/tipo de calagem, deixando-os no valor padrão.

Roda local com `npm run test:e2e` em `frontend/`, e no CI a cada push em
`main` (job `test-frontend-e2e` em `.github/workflows/main.yml`), antes do
build/push das imagens Docker.

### 9.2 Segunda reimplementação da regra — "Inserção Rápida de Lotes"

`frontend/src/pages/NovaAnalisePage.tsx` (tela `/dashboard/nova-analise`,
aba Calagem/Adubação) tem sua **própria reimplementação** da mesma regra
de campos condicionais da §9, numa função separada (`isCellEnabled`) que
habilita/desabilita colunas da planilha de lote em vez de blocos JSX. Ela
não reaproveita nada de `CalculadoraPage.tsx` nem de `determinarCamposNecessarios()`
— é lógica duplicada, com risco de divergência (o mesmo risco já citado na
nota da §2 sobre o `.superRefine()` e o `determinarCamposNecessarios()`
precisarem ficar sincronizados).

> **Dois bugs corrigidos em 2026-08-23**, encontrados ao auditar essa
> reimplementação contra o `CalagemSchema`/`AdubacaoSchema` (fonte real de
> validação no envio, em `handleSalvarTudo`):
>
> 1. **Erro de nome de propriedade**: `configGlobais` guarda o estado como
>    `primeiraCalagem` (camelCase), mas `isCellEnabled` lia
>    `configGlobais.primeira_calagem` (snake_case) — propriedade
>    inexistente, sempre `undefined`. Na prática, o toggle "1ª Calagem /
>    Reaplicação" da tela **não tinha nenhum efeito** em quais colunas
>    apareciam; a coluna `v_atual`/`ctc` ficava habilitada só em função do
>    SMP, ignorando se era reaplicação de verdade.
> 2. **Consequência prática**: em `PD Consolidado + Reaplicação + pH < 5.5
>    + SMP > 6.3`, a coluna `V (%)` (`v_atual`) ficava **desabilitada**,
>    mas o `CalagemSchema` exige esse campo nesse exato caso (trava
>    RN-04/§6.3 em reaplicação) — o lote nunca conseguia ser salvo, sem
>    nenhuma forma de corrigir pela tela.
> 3. **Bug separado, Adubação**: `AdubacaoSchema` exige `finalidade_cevada`
>    sempre que `cultura === 'cevada'`, mas essa tela não tinha esse campo
>    em nenhum lugar das Configurações Globais — **qualquer lote de
>    Cevada falhava ao salvar, sempre**, não só em algum caso de borda.
>
> Corrigido: `isCellEnabled` agora usa `configGlobais.primeiraCalagem` e
> exige reaplicação (`!primeiraCalagem`) para liberar `v_atual` via a trava
> do PD Consolidado (antes exigia o oposto); foi adicionado o campo
> "Finalidade Cevada" nas Configurações Globais de Adubação, espelhando as
> mesmas opções de `AdubacaoPage.tsx`.

Cobertura de teste: `frontend/src/pages/NovaAnalisePage.test.ts` (Vitest)
exporta `isCellEnabled` e testa a mesma matriz de combinações da §9.1,
mas perguntando diretamente ao `CalagemSchema.safeParse()` real se cada
campo é exigido — se `isCellEnabled` algum dia desabilitar um campo que o
schema exige, o teste falha (é assim que ele detectou o bug acima). Roda
com `npm test` em `frontend/`, e no CI antes dos testes e2e (mesmo job
`test-frontend-e2e`). O bug da Cevada foi corrigido e verificado por
leitura direta do código + `tsc --noEmit`, sem teste automatizado
dedicado — não há harness de teste de componente (Testing Library) neste
projeto ainda para cobrir a renderização condicional do campo na tela.
