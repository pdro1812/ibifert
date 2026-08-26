# Plano de Testes — Validação Agronômica (Calagem e Adubação)

> **Versão:** esboço inicial — 2026-08-26
> **Objetivo:** a coordenadora agronôma confere, cenário a cenário, se as
> doses calculadas pelo sistema batem com o que ela calcularia manualmente
> pelo Manual de Calagem e Adubação para os Estados do RS e SC (2016).
> **Como funciona:** cada cenário abaixo já vem com os valores prontos para
> digitar na tela e o resultado que o sistema **deveria** mostrar. Ela só
> preenche, clica em Calcular, e compara.

---

## Como usar este documento

1. Leia primeiro a **Parte 3 — Manual de Execução**, é rápida e explica
   onde clicar.
2. Vá cenário por cenário nas **Partes 1 e 2**, preenchendo os campos
   exatamente como escrito na coluna "Entrada".
3. Compare o resultado da tela com a coluna "Resultado Esperado".
4. Marque ✅ (bateu) ou ❌ (não bateu) e escreva qualquer observação na
   coluna/linha de anotações — inclusive coisas que pareceram estranhas,
   confusas na tela, ou sugestões de melhoria, mesmo que o número em si
   esteja certo.
5. Cenários marcados **⭐ Atenção especial** testam pontos onde já
   encontramos e corrigimos bugs antes — vale conferir com mais cuidado.

---

## Parte 1 — Calagem (Calculadora de Calcário)

Tela: **Calculadora de Calagem** (menu público / dashboard).

### C1 — Convencional, pH já corrigido (não deve recomendar calcário)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| Primeira aplicação de calcário? | Sim |
| pH em água | `5.8` |
| Índice SMP | `6.0` |
| PRNT (%) | `80` |

**Resultado esperado:** sistema **não recomenda aplicar calcário** (dose
= 0), com aviso de que o pH já está adequado.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C2 — Convencional, método SMP (SMP ≤ 6,3)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| Primeira aplicação de calcário? | Sim |
| pH em água | `5.0` |
| Índice SMP | `5.6` |
| PRNT (%) | `100` |

**Resultado esperado:** aplica calcário, **NC final ≈ 5,4 t/ha**,
**NC ajustada (PRNT) ≈ 5,4 t/ha**, modo **Incorporado**, profundidade
20 cm, método usado = SMP.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C3 — Convencional, método Polinomial (SMP > 6,3)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| Primeira aplicação de calcário? | Sim |
| pH em água | `5.0` |
| Índice SMP | `6.8` |
| MO (%) | `3.0` |
| Al trocável (cmolc/dm³) | `1.5` |
| PRNT (%) | `80` |

**Resultado esperado:** método usado = Polinomial, **NC base ≈ 5,55 t/ha**,
**NC ajustada (PRNT) ≈ 6,94 t/ha**, modo Incorporado, 20 cm.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C4 — Plantio Direto em Implantação, incorporado (fluxo padrão)

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Implantação |
| Primeira aplicação de calcário? | Sim |
| pH em água | `5.2` |
| Índice SMP | `5.8` |
| PRNT (%) | `90` |
| Opção "superficial em campo natural" | **não marcar** |

**Resultado esperado:** aplica calcário, **NC final ≈ 4,2 t/ha**,
**NC ajustada ≈ 4,67 t/ha**, modo **Incorporado**, 20 cm.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C5 — Plantio Direto em Implantação, superficial em campo natural

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Implantação |
| Primeira aplicação de calcário? | Sim |
| pH em água | `5.2` |
| Índice SMP | `5.8` |
| PRNT (%) | `100` |
| Opção "superficial em campo natural" | **marcar** |

**Resultado esperado:** dose cai pela metade em relação ao C4 — **NC final
≈ 2,1 t/ha**, **NC ajustada ≈ 2,1 t/ha**, modo **Superficial** (sem
profundidade de incorporação).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C6 — PD Consolidado, dose normal (fator reduzido, sem trava)

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Consolidado |
| Primeira aplicação de calcário? | Sim |
| pH em água | `5.0` |
| Índice SMP | `5.0` |
| PRNT (%) | `80` |
| Al saturação (%) | `20` |

**Resultado esperado:** aplica calcário, **NC final ≈ 2,48 t/ha**,
**NC ajustada ≈ 3,09 t/ha**, modo **Superficial**, sem alerta de limite.

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C7 ⭐ Atenção especial — PD Consolidado, solo "tamponado" (trava de não aplicar)

Este cenário testa uma regra sutil: pH baixo, mas o solo já tem boa
saturação de bases e pouco alumínio — o manual diz que **não é necessário
aplicar calcário**, mesmo com pH baixo. Já existiu um bug aqui (o sistema
recomendava calcário quando não devia); foi corrigido, mas vale conferir
de novo.

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Consolidado |
| Primeira aplicação de calcário? | Não (reaplicação) |
| pH em água | `5.2` |
| Índice SMP | `5.8` |
| V atual (%) | `66` |
| CTC pH7 | `10` |
| Al saturação (%) | `8` |
| PRNT (%) | `80` |

**Resultado esperado:** sistema **NÃO recomenda aplicar calcário** (dose
= 0), mesmo com pH abaixo de 5,5 — porque V% ≥ 65 e Al_sat < 10%. Deve
aparecer um aviso explicando o motivo ("solo tamponado").

**Se o sistema recomendar uma dose diferente de zero aqui, é um bug grave
— avisar imediatamente.**

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C8 — PD Consolidado, trava de limite de 5 t/ha

| Campo | Valor |
|---|---|
| Sistema de Manejo | PD Consolidado |
| Primeira aplicação de calcário? | Sim |
| pH em água | `4.8` |
| Índice SMP | `4.4` |
| PRNT (%) | `100` |
| Al saturação (%) | `25` |

**Resultado esperado:** a dose calculada internamente passaria de 5 t/ha
(5,25), mas o sistema deve **travar em NC final = 5,0 t/ha** e mostrar um
alerta dizendo que o limite de aplicação superficial foi atingido. NC
ajustada = 5,0 t/ha (PRNT=100).

☐ Bateu ☐ Não bateu — Observações: ___________________________________

---

### C9 — Reaplicação com comparação de métodos (NC pelo SMP x NC pela Saturação de Bases)

| Campo | Valor |
|---|---|
| Sistema de Manejo | Convencional |
| Primeira aplicação de calcário? | Não (reaplicação) |
| pH em água | `5.0` |
| Índice SMP | `5.6` |
| V atual (%) | `50` |
| CTC pH7 | `10` |
| PRNT (%) | `100` |

**Resultado esperado:** o sistema mostra **duas doses de referência**:
pelo método SMP ≈ **5,4 t/ha** e pela Saturação de Bases (NC_vb) ≈
**2,5 t/ha**, com um texto explicando que a escolha entre as duas é
decisão do técnico. O resultado final adotado (NC ajustada) deve ser o do
método SMP, **5,4 t/ha**.

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

### A4 ⭐ Atenção especial — Soja, 2º cultivo, solo já muito rico em P e K

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

**Pergunta para a coordenadora:** essa forma de exibir ("0 kg/ha" + texto)
é aceitável, ou o time agronômico esperava ver um número sugerido de
reposição mesmo no 2º cultivo?

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

## Parte 3 — Manual de Execução (passo a passo)

### Antes de começar

- Use o navegador normal (Chrome, Edge, etc.), acesse o sistema como
  faria no dia a dia.
- Tenha este documento impresso ou em uma segunda tela, para ir marcando.
- Não é necessário estar logada para usar as calculadoras — mas se
  quiser salvar os resultados no histórico, faça login antes.

### Passo a passo — Calagem

1. Abra a tela **Calculadora de Calagem**.
2. Escolha o **Sistema de Manejo** indicado no cenário.
3. Responda **"Primeira aplicação de calcário?"** (Sim/Não) conforme o
   cenário — isso muda quais campos aparecem a seguir.
4. Preencha **pH em água**, **Índice SMP** e **PRNT (%)**.
5. Conforme o sistema de manejo e as respostas anteriores, campos extras
   vão aparecendo na tela (MO, Al trocável, V atual, CTC, Al saturação
   etc.) — preencha só os que aparecerem, exatamente com os valores do
   cenário. Se um campo do cenário não aparecer na tela, é uma observação
   válida para anotar (pode ser um problema no formulário).
6. Marque a caixa de aceite dos Termos de Uso (obrigatória para calcular).
7. Clique em **Calcular**.
8. Compare o resultado mostrado (NC base, NC final, NC ajustada, modo de
   aplicação, alertas) com a coluna "Resultado esperado" do cenário.
9. Marque ✅/❌ e escreva qualquer observação — inclusive sobre clareza da
   tela, textos confusos, ou sugestões.
10. Clique em **Limpar/Novo cálculo** (ou recarregue a página) antes de
    ir para o próximo cenário, para não misturar dados de um cenário com
    o outro.

### Passo a passo — Adubação

1. Abra a tela **Calculadora de Adubação**.
2. Preencha os campos de **Solo** (Argila, MO, CTC, P, K — escolhendo o
   método Mehlich correto —, Ca, Mg, e os opcionais quando o cenário
   pedir: S, pH, Cu, Zn, B, Mn).
3. Preencha os campos de **Cultura e Manejo** (Cultura, Cultura
   Antecedente se aparecer, Rendimento Esperado, Número do Cultivo, Tipo
   de Correção se o cenário pedir "Total", Densidade de Plantas se for
   milho).
4. Clique em **Calcular**.
5. Compare **N, P₂O₅, K₂O** (incluindo a divisão semeadura/complementar
   do K quando houver) e a lista de **alertas** com o esperado.
6. Marque ✅/❌ e anote observações.
7. Limpe o formulário (ou recarregue) antes do próximo cenário.

### O que anotar, além de "bateu / não bateu"

Mesmo quando o número calculado está certo, vale registrar:

- Textos de alerta confusos, incompletos ou que faltam contexto técnico.
- Campos que pareceram fora de ordem, ou que não ficou claro por que
  apareceram/não apareceram.
- Qualquer valor que "parece certo, mas eu calcularia diferente" — mesmo
  sem ter certeza, é melhor anotar do que deixar passar.
- Sugestões de novos cenários que valeria a pena testar depois.

### Resumo final (preencher ao final de todos os cenários)

| Total de cenários testados | ______ |
|---|---|
| Bateram (✅) | ______ |
| Não bateram (❌) | ______ |
| Cenários que geraram dúvida/observação, mesmo tendo batido | ______ |

**Observações gerais / recomendações:**

_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________
