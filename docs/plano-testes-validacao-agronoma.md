# Plano de Testes — Validação Agronômica (Calagem e Adubação)

---

## Parte 1 — Calagem (Calculadora de Calcário)

> **Mudança de comportamento (2026-10-02, item 5 do registro):** o **SMP é
> sempre o valor em evidência**; o Polinomial passou a ser um valor
> **complementar** (checkbox "Calcular também o Polinomial" na Calculadora
> Completa, ou automático quando SMP > 6,3), e a Saturação por Bases segue
> como referência só com SMP ≤ 6,3. Além disso, o sistema agora emite um
> **alerta de divergência** quando Polinomial ou Saturação por Bases diferem
> do SMP em mais de 20% (e ao menos 0,5 t/ha) — então cenários com SMP e
> Saturação por Bases distantes (ex.: C2, C4, C9) passam a exibir esse alerta
> adicional além do que está descrito abaixo. O cenário **C3** mudou de
> resultado esperado (ver C3).

Tela: **Calculadora de Calagem** (menu público / dashboard).

> **Mudança de comportamento (2026-09-15):** o campo "Tipo de Aplicação"
> (Primeira calagem / Reaplicação) foi removido da tela — todo cálculo
> passou a ser tratado como reaplicação (ver
> `docs/diagnostico-primeira-calagem-metodo-smp.md`). Efeito prático nos
> cenários abaixo: **sempre que o método roteado é SMP** (índice SMP
> ≤ 6,3), a tela agora também pede `V atual` e `CTC pH7`, e o resultado
> passa a exibir uma referência adicional — **Saturação por Bases** — ao
> lado da dose principal, mesmo em cenários que antes não mostravam essa
> referência (C1, C2, C4, C5, C6, C8). Isso vale mesmo quando a dose final
> é zero (C1), porque o campo é exigido pela validação independentemente
> do resultado do cálculo.

> **Correção de cálculo (2026-09-16, commit `f6e9c4e`):** a referência de
> Saturação por Bases (`NC_vb`) passou a receber o mesmo fator de ajuste
> aplicado à dose principal quando a aplicação é superficial (¼ no PD
> Consolidado, ½ no PD Implantação em campo natural) — antes ela era
> calculada sem esse ajuste, o que a tornava não comparável à dose
> principal nesses casos (ver `docs/auditoria-calagem-manual-vs-codigo.md`,
> achado 1.1). Isso muda o `NC_vb` esperado em **C5, C6 e C8** — valores
> já atualizados abaixo. Revalidado em 2026-09-28 rodando os 17 cenários
> (C1-C9/A1-A8) na nova Calculadora Completa (`/calculadora-completa`)
> contra a API real: os 14 valores restantes bateram exatamente.

### C1 — Convencional, pH já corrigido (não deve recomendar calcário)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| pH em água | `5.8` |
| Índice SMP | `6.0` |
| V atual (%) | `60` |
| CTC pH7 | `10` |
| PRNT (%) | `80` |

**Resultado esperado:** sistema **não recomenda aplicar calcário** (dose
= 0), com aviso de que o pH já está adequado.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C2 — Convencional, método SMP (SMP ≤ 6,3)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| pH em água | `5.0` |
| Índice SMP | `5.6` |
| V atual (%) | `50` |
| CTC pH7 | `10` |
| PRNT (%) | `100` |

**Resultado esperado:** aplica calcário, **NC final ≈ 5,4 t/ha**,
**NC ajustada (PRNT) ≈ 5,4 t/ha**, modo **Incorporado**, profundidade
20 cm, método usado = SMP. Referência de Saturação por Bases (NC_vb)
≈ **2,5 t/ha**.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C3 — Convencional, método Polinomial (SMP > 6,3)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| pH em água | `5.0` |
| Índice SMP | `6.8` |
| MO (%) | `3.0` |
| Al trocável (cmolc/dm³) | `1.5` |
| PRNT (%) | `80` |

**Resultado esperado (atualizado em 2026-10-02):** o valor em evidência é
o do **SMP**: **NC base ≈ 0,3 t/ha**, **NC ajustada (PRNT 80%) ≈ 0,38 t/ha**,
modo Incorporado, 20 cm. O Polinomial é calculado **automaticamente**
(SMP > 6,3) e aparece como **"Complementar — Polinomial" ≈ 5,55 t/ha**
(com PRNT 80% seria ≈ 6,94 t/ha, mas o valor complementar é mostrado antes
do PRNT). Alertas esperados: (1) aviso de que o Polinomial foi calculado
automaticamente; (2) **alerta de divergência** (Polinomial ≈ 1.750% acima
do SMP). Sem referência de Saturação por Bases (só com SMP ≤ 6,3).

> ⚠️ **Antes desta mudança** o valor oficial deste cenário era o Polinomial
> (NC ajustada ≈ 6,94 t/ha). O SMP em evidência foi pedido pela coordenadora;
> o `docs/diagnostico-primeira-calagem-metodo-smp.md` §2 já apontava que, em
> solos com SMP > 6,3, a tabela SMP subestima a dose (aqui ~18×). Vale a
> coordenadora confirmar que é isso mesmo que quer ver neste cenário.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C4 — Plantio Direto em Implantação, incorporado (fluxo padrão)

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Implantação |
| pH em água | `5.2` |
| Índice SMP | `5.8` |
| V atual (%) | `55` |
| CTC pH7 | `10` |
| PRNT (%) | `90` |
| Opção "superficial em campo natural" | **não marcar** |

**Resultado esperado:** aplica calcário, **NC final ≈ 4,2 t/ha**,
**NC ajustada ≈ 4,67 t/ha**, modo **Incorporado**, 20 cm. Referência de
Saturação por Bases (NC_vb) ≈ **2,0 t/ha**.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C5 — Plantio Direto em Implantação, superficial em campo natural

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Implantação |
| pH em água | `5.2` |
| Índice SMP | `5.8` |
| V atual (%) | `55` |
| CTC pH7 | `10` |
| PRNT (%) | `100` |
| Opção "superficial em campo natural" | **marcar** |

**Resultado esperado:** dose cai pela metade em relação ao C4 — **NC final
≈ 2,1 t/ha**, **NC ajustada ≈ 2,1 t/ha**, modo **Superficial** (sem
profundidade de incorporação). Referência de Saturação por Bases (NC_vb)
≈ **1,0 t/ha** (valor bruto 2,0 t/ha × fator ½ do campo natural — ver nota
de correção no topo do documento).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C6 — PD Consolidado, dose normal (fator reduzido, sem trava)

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Consolidado |
| pH em água | `5.0` |
| Índice SMP | `5.0` |
| V atual (%) | `40` |
| CTC pH7 | `10` |
| PRNT (%) | `80` |
| Al saturação (%) | `20` |

**Resultado esperado:** aplica calcário, **NC final ≈ 2,48 t/ha**,
**NC ajustada ≈ 3,09 t/ha**, modo **Superficial**, sem alerta de limite.
Referência de Saturação por Bases (NC_vb) ≈ **0,88 t/ha** (valor bruto
3,5 t/ha × fator ¼ do PD Consolidado — ver nota de correção no topo do
documento).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C7 Atenção especial — PD Consolidado, solo "tamponado" (trava de não aplicar)

Este cenário testa uma regra sutil: pH baixo, mas o solo já tem boa
saturação de bases e pouco alumínio — o manual diz que **não é necessário
aplicar calcário**, mesmo com pH baixo. Já existiu um bug aqui (o sistema
recomendava calcário quando não devia); foi corrigido, mas vale conferir
de novo.

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Consolidado |
| pH em água | `5.2` |
| Índice SMP | `5.8` |
| V atual (%) | `66` |
| CTC pH7 | `10` |
| Al saturação (%) | `8` |
| PRNT (%) | `80` |

**Resultado esperado:** sistema **NÃO recomenda aplicar calcário** (dose
= 0), mesmo com pH abaixo de 5,5 — porque V% ≥ 65 e Al_sat < 10%. Deve
aparecer um aviso explicando o motivo ("solo tamponado").


☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C8 — PD Consolidado, trava de limite de 5 t/ha

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Consolidado |
| pH em água | `4.8` |
| Índice SMP | `4.4` |
| V atual (%) | `30` |
| CTC pH7 | `10` |
| PRNT (%) | `100` |
| Al saturação (%) | `25` |

**Resultado esperado:** a dose calculada internamente passaria de 5 t/ha
(5,25), mas o sistema deve **travar em NC final = 5,0 t/ha** e mostrar um
alerta dizendo que o limite de aplicação superficial foi atingido. NC
ajustada = 5,0 t/ha (PRNT=100). Referência de Saturação por Bases (NC_vb)
≈ **1,13 t/ha** (valor bruto 4,5 t/ha × fator ¼ do PD Consolidado — ver
nota de correção no topo do documento; a trava de 5 t/ha continua sendo
lida como teto sobre a dose efetivamente aplicada, não sobre este valor
de referência).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C9 — Comparação de métodos (NC pelo SMP x NC pela Saturação de Bases)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| pH em água | `5.0` |
| Índice SMP | `5.6` |
| V atual (%) | `50` |
| CTC pH7 | `10` |
| PRNT (%) | `100` |

**Resultado esperado:** (a partir de 2026-10-02 também aparece o alerta de divergência, pois 2,5 t/ha difere >20% de 5,4 t/ha) o sistema mostra **duas doses de referência**:
pelo método SMP ≈ **5,4 t/ha** e pela Saturação de Bases (NC_vb) ≈
**2,5 t/ha**, com um texto explicando que a escolha entre as duas é
decisão do técnico. O resultado final adotado (NC ajustada) deve ser o do
método SMP, **5,4 t/ha**. (Mesma entrada de C2 — mantido como cenário
dedicado à checagem do texto de comparação entre os dois métodos.)

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

## Parte 2 — Adubação (Calculadora de Adubação)

Tela: **Calculadora de Adubação**. Ela tem botões de **"Auto-preencher
Cenários"** com 3 exemplos prontos (soja manutenção, milho correção
total, cevada cervejeira) — pode usá-los como aquecimento antes dos
cenários abaixo, mas os cenários desta lista são mais específicos e cobrem
casos que os botões prontos não cobrem.

### A1 — Soja, adubação de manutenção (P/K baixos) + limite de K na semeadura

| Campo | Valor |
|---|---|
| Argila (%) | `30` |
| Matéria Orgânica (%) | `3.0` |
| CTC a pH 7 | `10` |
| Fósforo (P) | `8` — Método: Mehlich-1 |
| Potássio (K) | `50` — Método: Mehlich-1 |
| Cálcio (Ca) | `3.0` |
| Magnésio (Mg) | `1.0` |
| Enxofre (S) | `12` |
| pH (Água) | `6.0` |
| Cultura | Soja |
| Rendimento (t/ha) | `4` |
| Número do Cultivo | 1º |

**Resultado esperado:**
- **N = 0 kg/ha**, tipo "FBN" — com alerta para inocular a semente
  (soja fixa nitrogênio, não precisa adubação nitrogenada).
- **P₂O₅ = 110 kg/ha**, tipo "Corretiva Gradual 2/3 + Manutenção".
- **K₂O = 140 kg/ha no total**, mas dividido: **80 kg/ha na semeadura +
  60 kg/ha complementar** (cobertura/a lanço), com alerta explicando o
  limite de 80 kg/ha na linha.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### A2 — Trigo, cultura antecedente Gramínea, rendimento acima da referência

| Campo | Valor |
|---|---|
| Argila (%) | `30` |
| Matéria Orgânica (%) | `3.5` |
| CTC a pH 7 | `10` |
| Fósforo (P) | `20` — Método: Mehlich-1 |
| Potássio (K) | `70` — Método: Mehlich-1 |
| Cálcio (Ca) | `3.0` |
| Magnésio (Mg) | `1.0` |
| Cultura | Trigo |
| Cultura Antecedente | Gramínea |
| Rendimento (t/ha) | `4` |
| Número do Cultivo | 1º |

**Resultado esperado:**
- **N = 90 kg/ha**.
- **P₂O₅ = 60 kg/ha**, tipo "Manutenção".
- **K₂O = 70 kg/ha**, tipo "Corretiva Total + Manutenção" (sem divisão,
  fica abaixo de 80).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### A3 — Milho, correção total, solo muito pobre

| Campo | Valor |
|---|---|
| Argila (%) | `25` |
| Matéria Orgânica (%) | `2.0` |
| CTC a pH 7 | `8` |
| Fósforo (P) | `5` — Método: Mehlich-1 |
| Potássio (K) | `25` — Método: Mehlich-1 |
| Cálcio (Ca) | `3.0` |
| Magnésio (Mg) | `1.0` |
| Cultura | Milho |
| Cultura Antecedente | Gramínea |
| Rendimento (t/ha) | `8` |
| Número do Cultivo | 1º |
| Tipo de Correção | **Total** |
| Densidade de Plantas | `70000` |

**Resultado esperado:**
- **N = 130 kg/ha** (inclui o extra por alta densidade de plantas).
- **P₂O₅ = 280 kg/ha**, tipo "Corretiva Total + Manutenção".
- **K₂O = 200 kg/ha no total**, dividido em **80 na semeadura + 120
  complementar**.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### A4 Atenção especial — Soja, 2º cultivo, solo já muito rico em P e K

Este cenário é sabidamente ambíguo hoje: quando P/K estão em nível
"muito alto" e é o 2º cultivo do ano, o texto diz "reposição parcial a
critério do técnico", mas o número mostrado é **zero** — não é um valor
sugerido, é literalmente ausência de valor. Vale a coordenadora confirmar
se essa forma de exibir está clara o suficiente para quem vai aplicar a
adubação no campo, ou se precisa de ajuste.

| Campo | Valor |
|---|---|
| Argila (%) | `30` |
| Matéria Orgânica (%) | `3.0` |
| CTC a pH 7 | `10` |
| Fósforo (P) | `40` — Método: Mehlich-1 |
| Potássio (K) | `200` — Método: Mehlich-1 |
| Cálcio (Ca) | `3.0` |
| Magnésio (Mg) | `1.0` |
| Enxofre (S) | `15` |
| Cultura | Soja |
| Rendimento (t/ha) | `3` |
| Número do Cultivo | **2º** |

**Resultado esperado:** N = 0 (FBN). P₂O₅ e K₂O aparecem como **"0
kg/ha"** com o texto **"Reposição parcial — a critério do técnico"**.

☐ Bateu (comportamento é o esperado) ☐ Precisa ajuste — Observações: ___________________________________

---

### A5 — Ervilhaca, enxofre baixo (alerta de diagnose secundária)

| Campo | Valor |
|---|---|
| Argila (%) | `40` |
| Matéria Orgânica (%) | `3.0` |
| CTC a pH 7 | `10` |
| Fósforo (P) | `10` — Método: Mehlich-1 |
| Potássio (K) | `50` — Método: Mehlich-1 |
| Cálcio (Ca) | `3.0` |
| Magnésio (Mg) | `1.0` |
| Enxofre (S) | `1` |
| Cultura | Ervilhaca |
| Rendimento (t/ha) | `2` |
| Número do Cultivo | 1º |

**Resultado esperado:**
- **N = 0 kg/ha** (fixação biológica), com alerta de inoculação.
- **P₂O₅ = 90 kg/ha**.
- **K₂O = 90 kg/ha no total**, dividido em **80 semeadura + 10
  complementar**.
- **Alerta de enxofre baixo**, recomendando 20 kg de S-SO4/ha.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### A6 — Soja com pH baixo (alerta de molibdênio)

| Campo | Valor |
|---|---|
| Argila (%) | `30` |
| Matéria Orgânica (%) | `3.0` |
| CTC a pH 7 | `10` |
| Fósforo (P) | `8` — Método: Mehlich-1 |
| Potássio (K) | `50` — Método: Mehlich-1 |
| Cálcio (Ca) | `3.0` |
| Magnésio (Mg) | `1.0` |
| Enxofre (S) | `15` |
| pH (Água) | `5.0` |
| Cultura | Soja |
| Rendimento (t/ha) | `3` |
| Número do Cultivo | 1º |

**Resultado esperado:**
- **N = 0 kg/ha** (FBN).
- **P₂O₅ = 95 kg/ha**.
- **K₂O = 115 kg/ha**, dividido em **80 semeadura + 35 complementar**.
- **Alerta de molibdênio** (pH abaixo de 5,5 pode reduzir eficiência da
  fixação biológica).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### A7 — Micronutrientes e Ca/Mg baixos (todos os alertas de diagnose secundária de uma vez)

| Campo | Valor |
|---|---|
| Argila (%) | `30` |
| Matéria Orgânica (%) | `3.0` |
| CTC a pH 7 | `10` |
| Fósforo (P) | `15` — Método: Mehlich-1 |
| Potássio (K) | `50` — Método: Mehlich-1 |
| Cálcio (Ca) | `1.5` |
| Magnésio (Mg) | `0.3` |
| Cobre (Cu) | `0.1` |
| Zinco (Zn) | `0.1` |
| Boro (B) | `0.05` |
| Manganês (Mn) | `2.0` |
| Cultura | Feijão |
| Rendimento (t/ha) | `2` |
| Número do Cultivo | 1º |

**Resultado esperado:**
- **N = 50 kg/ha**, **P₂O₅ = 70 kg/ha**, **K₂O = 80 kg/ha** (exatamente
  no limite, sem divisão de dose).
- **6 alertas de diagnose secundária**: Cobre baixo, Zinco baixo, Boro
  baixo, Manganês baixo, Cálcio baixo (sugere calagem), Magnésio baixo
  (sugere calcário dolomítico).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### A8 — Cevada cervejeira (regra especial de N pós-espigamento)

| Campo | Valor |
|---|---|
| Argila (%) | `30` |
| Matéria Orgânica (%) | `2.0` |
| CTC a pH 7 | `10` |
| Fósforo (P) | `5` — Método: Mehlich-1 |
| Potássio (K) | `25` — Método: Mehlich-1 |
| Cálcio (Ca) | `3.0` |
| Magnésio (Mg) | `1.0` |
| Cultura | Cevada |
| Cultura Antecedente | Gramínea |
| Finalidade Cevada | Cervejeira (malte único) |
| Rendimento (t/ha) | `3` |
| Número do Cultivo | 1º |

**Resultado esperado:**
- **N = 80 kg/ha**, com **alerta específico**: não aplicar nitrogênio
  após o espigamento (afeta o teor de proteína do grão, importante para
  cevada cervejeira).
- **P₂O₅ = 155 kg/ha**.
- **K₂O = 110 kg/ha**, dividido em **80 semeadura + 30 complementar**.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---
