# Referência Técnica — Cálculo de Adubação (Grãos)

---

## 1. Visão geral

O motor de adubação calcula as doses de **N, P₂O₅ e K₂O** (kg/ha) para uma
cultura de grãos, a partir de uma análise de solo e do rendimento esperado.
Também classifica o solo em faixas de disponibilidade e gera alertas de
diagnose secundária (S, micronutrientes, Ca, Mg, Mo).

```
Frontend (AdubacaoPage) → POST /api/adubacao
  → schemas/adubacaoSchema.ts (validação)
  → services/motorAdubacao.ts::executarMotorAdubacao()
      ├─ services/calculadoraAdubacao.ts   (conversão Mehlich-3→1)
      ├─ services/tabelasAdubacaoGraos.ts  (classificação + tabelas de dose)
      └─ services/warningsAdubacao.ts      (alertas de diagnose secundária)
  → database/adubacao.ts::criarAnaliseAdubacao() (persistência)
```

Fonte agronômica: **Manual de Calagem e Adubação para os Estados do RS e
SC (2016)**, capítulo de recomendação para grãos, e a spec derivada
`docs_antigos/adubacao.md` (tabelas TAB-01 a TAB-06 citadas nos comentários
do código).

Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `backend/src/schemas/adubacaoSchema.ts` | Validação de entrada (zod) + tipos + enums |
| `backend/src/services/motorAdubacao.ts` | Orquestração: pipeline completo, montagem do resultado |
| `backend/src/services/calculadoraAdubacao.ts` | Conversão de extrator (Mehlich-3 → Mehlich-1) |
| `backend/src/services/tabelasAdubacaoGraos.ts` | Classificação de solo + tabelas de dose por cultura |
| `backend/src/services/warningsAdubacao.ts` | Alertas de diagnose secundária (S, Mo, micros, Ca, Mg) |
| `backend/src/database/adubacao.ts` | Persistência do resultado |

---

## 2. Dados de entrada (`AdubacaoSchema`)

### Grupo A — Solo

| Campo | Obrigatório? | Faixa | Observação |
|---|---|---|---|
| `argila` | sim | 0 – 99% | usada para classe de argila e conversão Mehlich |
| `MO` | sim | > 0 e ≤ 20% | matéria orgânica |
| `CTC_pH7` | sim | > 0 | |
| `P` + `metodo_P` | sim | P > 0 | `metodo_P`: `Mehlich-1` ou `Mehlich-3` |
| `K` + `metodo_K` | sim | K > 0 | idem |
| `Ca`, `Mg` | sim | > 0 | usados só para alerta de diagnose (§3), não entram no NPK |
| `S`, `Cu`, `Zn`, `B`, `Mn` | não (exceto S condicional) | ≥ 0 | só geram alerta se informados |
| `pH_agua` | não | > 0 | só usado no alerta de molibdênio (soja) |

### Grupo B — Cultura e manejo

| Campo | Obrigatório? | Observação |
|---|---|---|
| `cultura` | sim | 16 opções (enum) |
| `num_cultivo` | sim | `'1'` ou `'2'` — cultivo do ano |
| `rendimento_esperado` | sim | > 0, em t/ha |
| `sistema_cultivo` | sim | `Convencional` \| `Plantio Direto` — **validado mas não usado em nenhum cálculo do motor atual** (ver nota abaixo) |
| `tipo_correcao` | não, default `Gradual` | `Gradual` \| `Total` |
| `cultura_antecedente` | condicional | ver regra abaixo |
| `finalidade_cevada` | condicional | obrigatório se `cultura = 'cevada'` |
| `densidade_plantas` | não | só usada para milho (§4.3) |

Regras condicionais (`.refine()`):
- **`S` obrigatório** para `soja, ervilha, ervilhaca, canola, nabo_forrageiro`.
- **`cultura_antecedente` obrigatória** para `aveia_branca, aveia_preta,
  centeio, cevada, trigo, triticale, milho` — usada para escolher a linha
  certa da `TABELA_N_BASE` (leguminosa/gramínea/consorciação-pousio).
- **`tipo_correcao = 'Total'` exige `argila >= 20` e `CTC_pH7 >= 7.5`.**
- **`finalidade_cevada` obrigatória** quando `cultura = 'cevada'`.

> **Nota**: `sistema_cultivo` é coletado e validado, mas
> `motorAdubacao.ts` não lê esse campo em nenhum ponto do cálculo —
> Plantio Direto e Convencional recebem exatamente a mesma dose de NPK
> hoje. Se o manual prevê diferença de manejo por sistema de cultivo, é
> uma lacuna a confirmar (candidato de investigação futura, não é
> tratado nesta referência).

---

## 3. Pipeline de cálculo (`executarMotorAdubacao`)

```
entrada validada
  │
  ├─ gerarAlertasDiagnose()                 → alertas de S, Mo, micros, Ca, Mg (§6) — não afeta NPK
  │
  ├─ conversão de extrator (se Mehlich-3)   → P_M1, K_M1                      (§4.1)
  │
  ├─ classificação do solo                  → classe de argila, MO, CTC, P, K (§4.2)
  │
  ├─ cálculo de N                            (§4.3)
  │     ├─ cultura com FBN (bnf=true)? → N = 0
  │     └─ senão: base por classe MO (± cultura antecedente) + ajuste por produtividade + milho/densidade
  │
  ├─ cálculo de P2O5                         (§4.4)
  │     ├─ classe muito_alto? → 0 (1º cultivo) ou "reposição parcial" sem valor (2º cultivo)
  │     └─ senão: tabela por cultura/classe/cultivo, ou Correção Total se aplicável
  │
  ├─ cálculo de K2O                          (§4.4, mesma estrutura de P2O5)
  │     └─ se dose > 80 kg/ha → separa em semeadura (80) + complementar (excedente)
  │
  └─ retorno: classificação do solo + doses de N/P2O5/K2O + alertas
```

---

## 4. Fórmulas e regras de cálculo

### 4.1 Conversão de extrator — Mehlich-3 → Mehlich-1

Só aplicada se o laboratório informou o extrator Mehlich-3 (as tabelas de
classificação de P/K são calibradas para Mehlich-1):

```
P_M1 = P_M3 / (2 - 0.02 * argila)
K_M1 = K_M3 * 0.83
```
- Fonte: `calculadoraAdubacao.ts:1-10`.
- Lança erro se `argila >= 100` (evitaria divisão por zero/negativo — na
  prática o schema já limita `argila <= 99`, então esse erro não deveria
  ser alcançável via API, só via chamada direta da função).
- Exemplo: `P_M3 = 10`, `argila = 30` → `P_M1 = 10 / (2 - 0.6) = 7.14`.

### 4.2 Classificação do solo (`tabelasAdubacaoGraos.ts`)

| Atributo | Classes | Regra |
|---|---|---|
| **Argila** (TAB-01A) | 1 (>60%) a 4 (≤20%) — **note a inversão**: classe 4 = menos argila | `≤20→4`, `≤40→3`, `≤60→2`, `>60→1` |
| **MO** (TAB-01B) | baixo / médio / alto | `≤2.5→baixo`, `≤5.0→médio`, `>5.0→alto` |
| **CTC** (TAB-01C) | baixa / média / alta / muito alta | `≤7.5→baixa`, `≤15→média`, `≤30→alta`, `>30→muito alta` |
| **P** (TAB-02P) | muito_baixo…muito_alto (5 níveis) | faixas dependem da **classe de argila** — 4 tabelas de limiares diferentes, uma por classe |
| **K** (TAB-02K) | muito_baixo…muito_alto (5 níveis) | faixas dependem da **classe de CTC** — 4 tabelas de limiares diferentes |

Os limiares completos de P e K por classe estão em
`tabelasAdubacaoGraos.ts:49-104` — são 8 conjuntos de faixas no total (4
para P por classe de argila, 4 para K por classe de CTC), todos com valores
explícitos no código (sem fórmula).

### 4.3 Nitrogênio (N)

**Fixação Biológica (FBN)** — `soja, ervilha, ervilhaca` (`bnf: true` em
`CULTURAS_INFO`): `N = 0`, com alerta para inocular rizóbio. Nenhum outro
cálculo de N é feito para essas culturas.

**Demais culturas** — dose base por classe de MO, na `TABELA_N_BASE`:
- Para culturas com regra de 2-3 categorias (aveias, centeio, cevada,
  trigo, triticale, milho): a dose depende também de `cultura_antecedente`
  (`Leguminosa` / `Gramínea` / `Consorciação ou Pousio` — só milho tem as
  3; as demais têm só leguminosa/gramínea).
- Para as demais (canola, feijão, girassol, milho_pipoca, nabo_forrageiro,
  sorgo): dose fixa por classe de MO, sem depender de antecessora.

Ajuste por produtividade acima da referência da cultura:
```
ajuste = (rendimento_esperado - rend_ref) * fator_adicional_por_tonelada
```
`rend_ref` e o fator vêm de `TABELA_N_BASE[cultura].rend_ref_adic` /
`n_adic_t` — **exceto** para aveias/centeio/cevada/trigo/triticale, onde o
fator é sobrescrito no código (`motorAdubacao.ts:63-66`): **20** se
`cultura_antecedente = Leguminosa`, **30** caso contrário (o valor
`n_adic_t: 30` salvo na tabela para essas culturas é só o caso "gramínea",
o caso "leguminosa" é tratado à parte).

```
doseN = nBase + ajuste     (ajuste só soma se rendimento > referência; não há piso negativo explícito, mas ajuste também não é forçado a >= 0)
```

Ajustes adicionais:
- **Milho, alta densidade**: `+10 kg N` a cada 5.000 plantas/ha acima de
  65.000 (`Math.floor((densidade - 65000) / 5000) * 10`).
- **Alertas informativos** (não mudam a dose): `rendimento_esperado > 10`
  t/ha → sugere considerar +20-40% a critério técnico; `cevada` com
  `finalidade_cevada = 'cervejeira_malte_unico'` → alerta de não aplicar N
  após espigamento (limite de proteína do grão).

Exemplo: `cultura = trigo`, `MO = médio`, `cultura_antecedente = Gramínea`,
`rendimento_esperado = 4` (referência 3): `nBase = 60`,
`ajuste = (4-3)*30 = 30` → `doseN = 90` kg/ha.

### 4.4 Fósforo (P₂O₅) e Potássio (K₂O)

Mesma estrutura para os dois nutrientes — descrita aqui uma vez, aplicada
igual a `P2O5` e `K2O` (tabelas diferentes: `TABELA_PK_CULTURA[cultura].P2O5`
/ `.K2O`).

```
classe do nutriente == muito_alto?
  ├─ 1º cultivo → dose = 0
  │              (+ alerta com "reposição estimada" = exportação da cultura * rendimento_esperado, informativo)
  └─ 2º cultivo → tipo = "Reposição parcial — a critério do técnico"
                  dose PERMANECE 0 (nenhum valor numérico atribuído — ver nota)

classe != muito_alto:
  base = TABELA_PK_CULTURA[cultura][nutriente][classe][num_cultivo]
  ajusteRend = rendimento_esperado > rend_ref_t
                 ? (rendimento_esperado - rend_ref_t) * fator_adic_t
                 : 0

  tipo_correcao == 'Total' E 1º cultivo E classe em {muito_baixo,baixo,medio}?
    dose = TABELA_CORRECAO_TOTAL[classe] + manutencao_da_cultura + max(0, ajusteRend)
    tipo = "Corretiva Total + Manutenção"
  senão:
    dose = base + max(0, ajusteRend)
    tipo = conforme tabela de rótulos abaixo
```

Rótulos de `tipo` quando não é "Total" explícito:
| Classe | Nº cultivo | `tipo_adubacao` |
|---|---|---|
| muito_baixo / baixo | 1º | "Corretiva Gradual 2/3 + Manutenção" |
| muito_baixo / baixo | 2º | "Corretiva Gradual 1/3 + Manutenção" |
| médio | 1º | "Corretiva Total + Manutenção" |
| médio | 2º | "Manutenção" |
| alto | 1º ou 2º | "Manutenção" |

**Limite de K na linha de semeadura**: se `doseK2O > 80`, o excedente é
destacado como aplicação complementar (cobertura ou a lanço):
```
k2o_semeadura_kg_ha    = min(doseK2O, 80)
k2o_complementar_kg_ha = max(0, doseK2O - 80)
```
com alerta explicando o porquê (limite de segurança/eficiência para
aplicação na linha).

Exemplo P₂O₅: `cultura = soja`, classe P = `baixo`, 1º cultivo,
`rendimento_esperado = 4` (ref. 3), `tipo_correcao = Gradual`:
`base = P_TIPO1.baixo[1] = 95`, `ajusteRend = (4-3)*15 = 15` →
`doseP2O5 = 110` kg/ha, tipo "Corretiva Gradual 2/3 + Manutenção".

---

## 5. Tabelas de referência

Todas em `tabelasAdubacaoGraos.ts`, com valores explícitos (sem fórmula) —
usar como fonte de conferência linha a linha contra o manual PDF:

| Tabela | Linhas | Conteúdo |
|---|---|---|
| `TABELA_CORRECAO_TOTAL` (TAB-04) | 5 classes | dose fixa de P₂O₅/K₂O para correção total, por classe de disponibilidade |
| `CULTURAS_INFO` (TAB-05/06) | 16 culturas | rendimento de referência, manutenção de P₂O₅/K₂O, adicional por tonelada, exportação por tonelada, flag `bnf` |
| `TABELA_N_BASE` | 12 culturas (as 4 com FBN não têm linha — N sempre 0) | dose base de N por classe de MO (e cultura antecedente quando aplicável) |
| `TABELA_PK_CULTURA` | 16 culturas | dose de P₂O₅/K₂O por classe de disponibilidade × nº de cultivo — reaproveita 4 conjuntos-base (`P_TIPO1/2`, `K_TIPO1/2`) e define conjuntos próprios para canola, centeio, ervilhaca, milho, milho_pipoca, nabo_forrageiro, soja, sorgo |

---

## 6. Alertas de diagnose secundária (`warningsAdubacao.ts`)

Disparados **independentemente** do cálculo de NPK, direto a partir dos
campos opcionais informados (se o campo não veio, não há alerta):

| Gatilho | Condição | Mensagem/ação |
|---|---|---|
| Enxofre baixo | `S` informado e classificado `baixo` (crítico: 10 mg/dm³ para culturas exigentes — soja/ervilha/ervilhaca/canola/nabo; 5 para as demais) | recomenda 20 kg S-SO4/ha; se soja, sugere trocar parte da ureia por sulfato de amônio |
| Molibdênio | `cultura = soja` e `pH_agua < 5.5` | risco de eficiência de FBN reduzida; dose de Mo via semente ou foliar |
| Micronutrientes (Cu/Zn/B/Mn) | valor informado e classificado `baixo` | alerta genérico por nutriente, um por vez |
| Cálcio baixo | `Ca < 2.0` | sugere avaliar calagem |
| Magnésio baixo | `Mg < 0.5` | sugere calagem com calcário dolomítico |

Ca/Mg/S ligam de volta ao motor de **calagem**, mas só como texto — **não
há integração automática entre os dois cálculos** (o motor de adubação não
chama o motor de calagem, e vice-versa).

---

## 7. Saída e persistência

### 7.1 Formato retornado por `executarMotorAdubacao()`

```ts
{
  classificacao_solo: {
    argila_classe: 1 | 2 | 3 | 4,
    mo_classe: 'baixo' | 'medio' | 'alto',
    ctc_classe: 'baixa' | 'media' | 'alta' | 'muito_alta',
    p_classe: 'muito_baixo' | 'baixo' | 'medio' | 'alto' | 'muito_alto',
    k_classe: 'muito_baixo' | 'baixo' | 'medio' | 'alto' | 'muito_alto',
  },
  recomendacao: {
    n:    { dose_total_kg_ha: number, tipo: string },
    p2o5: { dose_total_kg_ha: number, tipo_adubacao: string },
    k2o:  {
      dose_total_kg_ha: number,
      k2o_semeadura_kg_ha: number,
      k2o_complementar_kg_ha: number,
      tipo_adubacao: string,
    },
  },
  alertas: AlertaAdubacao[],   // { nivel: 'INFO'|'AVISO'|'ERRO', codigo: string, mensagem: string }
}
```

| Campo | Sempre presente? | Observação |
|---|---|---|
| `classificacao_solo.*` | sim | reflete a entrada bruta, independe de haver dose calculada |
| `recomendacao.n.dose_total_kg_ha` | sim | `0` tanto para FBN quanto para um cálculo normal que resultou em zero — **não dá para distinguir os dois casos só pelo número**, é preciso olhar `tipo` (`"FBN (0 N)"` vs. outro texto) |
| `recomendacao.p2o5/k2o.dose_total_kg_ha` | sim | `0` quando classe é `muito_alto` (qualquer cultivo) — de novo, olhar `tipo_adubacao` para saber a razão |
| `k2o_semeadura_kg_ha` / `k2o_complementar_kg_ha` | sim | somam sempre `dose_total_kg_ha`; `complementar=0` é o caso comum (dose ≤ 80) |
| `alertas` | sim (pode ser vazio) | mistura alertas de diagnose secundária (§6) com alertas gerados durante o cálculo de N/P/K (FBN, rendimento alto, cevada cervejeira, limite de K) — **não vêm rotulados por qual etapa os gerou**, só por `codigo` |

**Regra de leitura importante — "0 kg/ha" é ambíguo por si só**: tanto N
quanto P₂O₅/K₂O podem retornar dose `0` em situações bem diferentes (solo
já muito rico vs. cultura fixadora vs. "reposição parcial a critério do
técnico" no 2º cultivo — este último caso, em especial, **não tem valor
numérico nenhum**, mesmo sendo um cenário onde alguma adubação de reposição
pode ser tecnicamente esperada). Sempre ler `tipo`/`tipo_adubacao` junto do
número antes de considerar "sem necessidade de adubação".

### 7.2 O que é persistido (tabela `analises_adubacao`, via `criarAnaliseAdubacao()`)

Grava **toda a entrada validada** (Grupo A + Grupo B, campo a campo, coluna
própria para cada um) **mais** o resultado inteiro como um único bloco:

```
recomendacao_json: jsonb  ← o objeto completo descrito em §7.1
                             (classificacao_solo + recomendacao + alertas)
```

- Não existem colunas próprias para `doseN`, `doseP2O5` etc. — tudo o que
  está em `recomendacao_json` só é consultável via JSON (não dá para fazer
  `WHERE` direto por dose de N sem operador JSONB), diferente da calagem
  (`docs/ref-calagem.md §7.2`), que grava cada resultado em coluna própria.
- Histórico é auto-suficiente (reproduzível sem depender do motor atual),
  mesmo trade-off da calagem.
