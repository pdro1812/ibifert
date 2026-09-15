# Referência Técnica — Cálculo de Calagem

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
| `primeira_calagem` | sim (enviado fixo pelo frontend) | — | boolean — **desde 2026-09-15 não é mais pergunta da UI**; os formulários sempre enviam `false` (reaplicação). Campo mantido no schema/banco por compatibilidade (ver `docs/diagnostico-primeira-calagem-metodo-smp.md`). |
| `pH_agua` | sim | — | 3.5 – 8.0 |
| `SMP` | sim | — | número (sem faixa fixa) |
| `PRNT` | sim | — | > 0 e ≤ 100 |
| `MO` (matéria orgânica) | não | `SMP > 6.3` (método Polinomial) | 0 – 100 |
| `Al_trocavel` | não | `SMP > 6.3`, ou PD_CONSOLIDADO+pH<5.5 sem Al_sat direto | ≥ 0 |
| `V_atual` | não | sempre que o método roteado é SMP (todo cálculo é tratado como reaplicação, `primeira_calagem=false`) | 0 – 100 |
| `CTC_pH7` | não | método SMP; ou PD_CONSOLIDADO+pH<5.5 sem Al_sat direto | > 0 |
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
  │     └─ calcula também NC_vb (saturação por bases), em paralelo — sempre,
  │        já que todo cálculo é tratado como reaplicação
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

### 4.3 Saturação por Bases — NC_vb (método SMP)

Calculada **em paralelo** ao NC_base/NC_smp sempre que o método roteado é
SMP (todo cálculo é tratado como reaplicação, `primeira_calagem=false`) —
é uma segunda referência, não substitui a principal (o resultado final
continua vindo do método SMP; `NC_vb` é informativo, para o técnico
comparar).

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
| `calcular_tambem_sat_bases` | boolean | sim | `true` quando o método roteado é SMP (indica se `NC_vb` deveria vir preenchido) — na prática, sempre que o método é SMP, já que todo cálculo é tratado como reaplicação |
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

## 8. Blocos condicionais na tela (`CalculadoraPage.tsx`, frontend)

A tela de cálculo (`frontend/src/pages/CalculadoraPage.tsx`) não pede todos
os campos condicionais da §2 de uma vez — ela libera "blocos" extras
conforme o que já foi respondido, para não pedir dado agronômico sem
necessidade. Os blocos são nomeados literalmente assim no JSX (título
visível na tela) e espelham a spec `docs_antigos/regras_calagem_graos_v2.md`
(seções B1–B4).

| Bloco | Campos pedidos | Condição de exibição | Fonte (frontend) |
|---|---|---|---|
| **B1** — Saturação por Bases | `V_atual`, `CTC_pH7` | método roteado = `SMP` (`SMP <= 6.3`) — independente do `sistema_manejo`. Não depende mais de `primeira_calagem` (removido da UI, sempre tratado como reaplicação) | `CalculadoraPage.tsx:661-673`, condição `isReaplicacaoSMP` (linha 318) |
| **B2** — Trava do PD Consolidado | `Al_sat` (direto, ou via `Al_trocavel`+`CTC_pH7`); `V_atual` também (sempre, já que todo cálculo é tratado como reaplicação) | `sistema_manejo === 'PD_CONSOLIDADO'` **e** `pH_agua < 5.5` | `CalculadoraPage.tsx:676-774`, condição `precisaAlSat` |
| **B3** — Método Polinomial | `MO`, `Al_trocavel` | método roteado = `POLINOMIAL` (`SMP > 6.3`) | `CalculadoraPage.tsx:513-525`, condição `isPolinomial` (linha 194) |
| **B4** — Monitoramento 10–20cm | `SMP_10_20`, `Al_sat_10_20` (ou via `monitoramento`) | exclusivo do `PD_CONSOLIDADO`, fluxo de reavaliação para `PD_COM_RESTRICAO` (ver §2, nota sobre `PD_COM_RESTRICAO`) | `CalculadoraPage.tsx:643+` |

