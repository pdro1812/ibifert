# Especificação de Regras de Negócio — Calagem para Culturas de Grãos
**Fonte:** Manual de Calagem e Adubação para os Estados do RS e de SC (2016), Capítulo 5  
**Escopo:** Exclusivamente culturas de GRÃOS (arroz irrigado **excluído**)  
**Versão:** 2.0  

---

## Glossário de Variáveis

| Símbolo | Nome Completo | Tipo | Unidade |
|---|---|---|---|
| `pH_agua` | pH em água do solo | Float | adimensional |
| `SMP` | Índice SMP do solo | Float | adimensional |
| `V_atual` | Saturação por bases atual | Float | % |
| `CTC_pH7` | Capacidade de troca de cátions a pH 7,0 | Float | cmolc/dm³ |
| `Al_trocavel` | Alumínio trocável | Float | cmolc/dm³ |
| `Al_sat` | Saturação por Al na CTC | Float | % — **campo condicional** |
| `MO` | Matéria orgânica do solo | Float | % — **campo condicional** |
| `PRNT` | Poder Relativo de Neutralização Total do calcário | Float | % |
| `NC_base` | NC calculada pelo método roteado (PRNT 100%) | Float | t/ha |
| `NC_final` | NC após fator de manejo e trava de limite | Float | t/ha |
| `NC_ajustada` | NC corrigida pelo PRNT real do produto | Float | t/ha |
| `sistema_manejo` | Sistema de manejo do solo | Enum | {CONVENCIONAL, PD_IMPLANTACAO, PD_CONSOLIDADO, PD_COM_RESTRICAO} |
| `metodo_calc_roteado` | Método definido automaticamente pelo sistema | Enum | {SMP, POLINOMIAL} |
| `primeira_calagem` | Indica se é a primeira correção da área | Boolean | — |

---

## Parte 1 — Campos, Ordem de Coleta e Condicionalidade

Esta parte define exatamente quais campos o sistema deve solicitar ao usuário, em que ordem, e sob qual condição cada campo aparece. A ideia central é: **nunca exibir um campo antes de saber que ele será necessário**.

### Bloco A — Campos Sempre Obrigatórios (coletados em qualquer cenário)

Estes campos são pedidos a todos os usuários, em todas as situações:

| Ordem | Campo | Descrição |
|---|---|---|
| 1 | `sistema_manejo` | Enum: Convencional / Implantação PD / PD Consolidado |
| 2 | `primeira_calagem` | Booleano: Sim (primeira vez) / Não (reaplicação) |
| 3 | `pH_agua` | pH em água da camada adequada ao sistema¹ |
| 4 | `SMP` | Índice SMP da mesma camada |
| 5 | `PRNT` | PRNT do calcário disponível (%) |

¹ A camada exata varia por sistema: 0–20 cm para Convencional e PD Implantação; 0–10 cm para PD Consolidado.

---

### Bloco B — Campos Condicionais: quando e por quê aparecem

#### B1 — `V_atual` e `CTC_pH7`

**Aparecem quando:**
```
SE primeira_calagem = FALSE  (reaplicação)
   E SMP <= 6.3
   E metodo_calc_roteado = SMP  (não polinomial)
ENTÃO exibir V_atual e CTC_pH7
/* motivo: o sistema vai calcular a NC pelo método Saturação por Bases
   como referência informativa paralela ao SMP */
```

Estes dois campos **nunca aparecem** em primeira calagem (o método SatBases não se aplica).

---

#### B2 — `Al_sat`

**Aparece quando:**
```
SE sistema_manejo = PD_CONSOLIDADO
   E pH_agua < 5.5
   /* só neste momento o sistema precisará verificar a trava de não-aplicação */
ENTÃO exibir Al_sat
```

**Como o sistema aceita Al_sat (forma flexível):**
```
OPÇÃO 1 — Usuário informa diretamente:
    campo: Al_sat (%)

OPÇÃO 2 — Usuário informa Al_trocavel e CTC_pH7, sistema calcula:
    Al_sat = (Al_trocavel / CTC_pH7) * 100.0
```

O sistema deve oferecer as duas opções. Se `CTC_pH7` já foi coletada no Bloco B1, reutilizar o valor — não pedir de novo.

---

#### B3 — `MO` e `Al_trocavel` (para equação polinomial)

**Aparecem quando:**
```
SE SMP > 6.3
   /* sistema roteou para método Polinomial */
ENTÃO exibir MO e Al_trocavel
```

Se `Al_sat` já foi coletado via Opção 2 (B2), o campo `Al_trocavel` já estará disponível. Não repetir a solicitação.

---

#### B4 — Monitoramento da camada 10–20 cm (PD Consolidado)

Este bloco é independente do fluxo principal de cálculo. Deve ser apresentado como uma seção separada ("Monitoramento de profundidade"), solicitado **somente** em PD Consolidado:

```
SE sistema_manejo = PD_CONSOLIDADO
ENTÃO exibir (como módulo opcional de monitoramento):
    pH_agua_10_20
    Al_sat_10_20
    disponibilidade_P_10_20_abaixo_critico  (booleano)
    compactacao_restringindo_raiz           (booleano)
    produtividade_abaixo_media              (booleano)
```

Se os dados de monitoramento indicarem restrição (ver RN-05), o sistema muda o `sistema_manejo` para `PD_COM_RESTRICAO` e solicita os campos adicionais necessários (SMP_10_20 para cálculo do SMP médio).

---

### Resumo Visual de Condicionalidade

```
Todos os cenários:
  → sistema_manejo, primeira_calagem, pH_agua, SMP, PRNT   [SEMPRE]

  SE SMP > 6.3:
      → MO, Al_trocavel                                     [POLINOMIAL]

  SE sistema_manejo = PD_CONSOLIDADO E pH_agua < 5.5:
      → Al_sat  (ou Al_trocavel + CTC_pH7)                  [TRAVA]

  SE reaplicação E SMP <= 6.3:
      → V_atual, CTC_pH7                                    [SAT_BASES referência]

  SE sistema_manejo = PD_CONSOLIDADO (monitoramento):
      → pH_agua_10_20, Al_sat_10_20, flags de restrição     [MONITORAMENTO]
```

---

## Parte 2 — Roteamento Automático de Método de Cálculo

O sistema **nunca pergunta ao usuário qual método usar**. O roteamento é determinístico com base nos dados de entrada.

### RN-01: Roteamento de Método

```
SE SMP > 6.3
    ENTÃO metodo_calc_roteado = POLINOMIAL
    /* SMP subestima acidez potencial em solos arenosos/baixo tamponamento */
SENÃO
    metodo_calc_roteado = SMP
```

### RN-02: Roteamento de Método para Reaplicações

```
SE primeira_calagem = FALSE
   E metodo_calc_roteado = SMP
    ENTÃO calcular_tambem_sat_bases = TRUE
    /* sistema calcula NC por SMP (principal) e por SatBases (referência informativa) */
    /* apresentar: NC_smp como recomendação, NC_vb como referência */
```

Para primeira calagem: `calcular_tambem_sat_bases = FALSE` sempre.

---

## Parte 3 — Tomada de Decisão (Gatilho de Aplicação)

### RN-03: Gatilho — Convencional e PD Implantação

**Campos necessários:** `pH_agua` (camada 0–20 cm)

```
SE pH_agua < 5.5
    ENTÃO aplicar_calcario = TRUE
SENÃO
    aplicar_calcario = FALSE
    /* exibir mensagem: "pH acima do limiar — não há necessidade de calagem no momento" */
```

---

### RN-04: Gatilho — PD Consolidado

**Campos necessários (em ordem):** `pH_agua` (camada 0–10 cm) → `Al_sat` (somente se pH < 5,5)

**Passo 1 — verificação de pH:**
```
SE pH_agua >= 5.5
    ENTÃO aplicar_calcario = FALSE
    /* encerrar fluxo aqui, não solicitar Al_sat */
```

**Passo 2 — se pH < 5,5, solicitar Al_sat e verificar trava:**
```
SE pH_agua < 5.5
    ENTÃO solicitar Al_sat  [campo B2 entra em cena]

    SE V_atual >= 65.0 E Al_sat < 10.0
        ENTÃO aplicar_calcario = FALSE
        /* trava: solo ainda bem tampado, não justifica aplicação */
        /* exibir mensagem: "pH abaixo de 5,5 mas saturação por bases >= 65% e
           Al_sat < 10%: calagem não recomendada neste momento" */
    SENÃO
        aplicar_calcario = TRUE
```

**Nota:** `V_atual` neste passo só é necessário se for reaplicação e já tiver sido coletado (Bloco B1). Se ainda não coletado, solicitá-lo junto com `Al_sat`.

---

### RN-05: Definição de Restrição na Camada 10–20 cm (PD Consolidado → PD com Restrição)

Esta verificação ocorre **somente** quando os dados do monitoramento (Bloco B4) estão disponíveis. É independente do fluxo principal de aplicação.

**Condição de restrição — TODAS as subcondições a seguir devem ser verdadeiras:**
```
restricao_10_20 = TRUE
    SE Al_sat_10_20 >= 30.0
    E (produtividade_abaixo_media = TRUE
       OU compactacao_restringindo_raiz = TRUE
       OU disponibilidade_P_10_20_abaixo_critico = TRUE)
```

**Se restrição confirmada:**
```
SE restricao_10_20 = TRUE
    ENTÃO sistema_manejo <- PD_COM_RESTRICAO
            solicitar SMP_10_20  /* para cálculo do SMP médio */
            emitir_alerta = "Recomenda-se avaliação por engenheiro agrônomo antes
                              de reiniciar o sistema plantio direto"
```

---

### RN-06: Gatilho — PD com Restrição

**Campos necessários:** `pH_agua` (média 0–20 cm), `Al_sat_10_20`

```
SE pH_agua_0_20_medio < 5.5
   E Al_sat_10_20 >= 30.0
    ENTÃO aplicar_calcario = TRUE
            modo_aplicacao = INCORPORADO
            acao_requerida = REINICIAR_PLANTIO_DIRETO
SENÃO
    aplicar_calcario = FALSE
```

---

## Parte 4 — Cálculo da Necessidade de Calcário (NC)

Todos os valores de NC nesta parte assumem `PRNT = 100%`. A conversão para o produto real é feita na Parte 6.

---

### RN-07: Cálculo pelo Método SMP (roteado quando SMP <= 6,3)

**Campos necessários:** `SMP`, `sistema_manejo`

**Passo 1 — determinar pH-alvo para busca na tabela:**
```
pH_alvo_tabela = 6.0
/* Para culturas de grãos o pH de referência é sempre 6,0.
   Independentemente do gatilho ter sido pH < 5,5,
   a dose é calculada para elevar até 6,0. */
```

**Passo 2 — consulta à Tabela 5.2:**

| Índice SMP | pH 5,5 | pH 6,0 | pH 6,5 |
|---|---|---|---|
| <= 4,4 | 15,0 | 21,0 | 29,0 |
| 4,5 | 12,5 | 17,3 | 24,0 |
| 4,6 | 10,9 | 15,1 | 20,0 |
| 4,7 | 9,6 | 13,3 | 17,5 |
| 4,8 | 8,5 | 11,9 | 15,7 |
| 4,9 | 7,7 | 10,7 | 14,2 |
| 5,0 | 6,6 | 9,9 | 13,3 |
| 5,1 | 6,0 | 9,1 | 12,3 |
| 5,2 | 5,3 | 8,3 | 11,3 |
| 5,3 | 4,8 | 7,5 | 10,4 |
| 5,4 | 4,2 | 6,8 | 9,5 |
| 5,5 | 3,7 | 6,1 | 8,6 |
| 5,6 | 3,2 | 5,4 | 7,8 |
| 5,7 | 2,8 | 4,8 | 7,0 |
| 5,8 | 2,3 | 4,2 | 6,3 |
| 5,9 | 2,0 | 3,7 | 5,6 |
| 6,0 | 1,6 | 3,2 | 4,9 |
| 6,1 | 1,3 | 2,7 | 4,3 |
| 6,2 | 1,0 | 2,2 | 3,7 |
| 6,3 | 0,8 | 1,8 | 3,1 |
| 6,4 | 0,6 | 1,4 | 2,6 |
| 6,5 | 0,4 | 1,1 | 2,1 |
| 6,6 | 0,2 | 0,8 | 1,6 |
| 6,7 | 0,0 | 0,5 | 1,2 |
| 6,8 | 0,0 | 0,3 | 0,8 |
| 6,9 | 0,0 | 0,2 | 0,5 |
| 7,0 | 0,0 | 0,0 | 0,2 |
| >= 7,1 | 0,0 | 0,0 | 0,0 |

```
NC_base = tabela_smp_lookup(SMP, pH_alvo_tabela=6.0)
```

**Interpolação:** O manual não especifica interpolação entre linhas. Implementação recomendada: usar o valor do SMP imediatamente inferior (floor) para busca na tabela.

**Passo 3 — aplicar fator de manejo:**
```
SE sistema_manejo IN {CONVENCIONAL, PD_IMPLANTACAO}
    ENTÃO fator_manejo = 1.0

SE sistema_manejo = PD_CONSOLIDADO
    ENTÃO fator_manejo = 0.25

SE sistema_manejo = PD_COM_RESTRICAO
    ENTÃO SMP_entrada = (SMP_0_10 + SMP_10_20) / 2.0
            NC_base = tabela_smp_lookup(SMP_entrada, pH_alvo_tabela=6.0)
            fator_manejo = 1.0

NC_smp = NC_base * fator_manejo
```

---

### RN-08: Cálculo pelo Método Polinomial (roteado quando SMP > 6,3)

**Campos necessários:** `MO`, `Al_trocavel`

**Fórmulas por pH-alvo:**
```
NC_pol_5_5 = -0.653 + (0.480 * MO) + (1.937 * Al_trocavel)
NC_pol_6_0 = -0.516 + (0.805 * MO) + (2.435 * Al_trocavel)
NC_pol_6_5 = -0.122 + (1.193 * MO) + (2.713 * Al_trocavel)
```

**Para culturas de grãos:** usar sempre `NC_pol_6_0`.

**Pós-cálculo:**
```
SE NC_pol_6_0 < 0.0
    ENTÃO NC_pol_6_0 = 0.0

/* Aplicar fator de manejo igual ao método SMP: */
NC_pol = NC_pol_6_0 * fator_manejo
/* fator_manejo segue a mesma tabela de RN-07 */
```

---

### RN-09: Cálculo pelo Método Saturação por Bases (somente reaplicações, referência informativa)

**Campos necessários:** `V_atual`, `CTC_pH7`

**Correspondência pH de referência → V% desejada:**
```
pH_referencia = 6.0  →  V_desejada = 75.0%
```

**Ajuste opcional por CTC_pH7:**
```
SE CTC_pH7 < 7.5
    ENTÃO V_desejada = V_desejada - 5.0   /* → 70% */
SE CTC_pH7 > 15.0
    ENTÃO V_desejada = V_desejada + 5.0   /* → 80% */
/* 7.5 <= CTC_pH7 <= 15.0: sem ajuste → 75% */
```

**Fórmula:**
```
NC_vb = ((V_desejada - V_atual) / 100.0) * CTC_pH7

SE NC_vb < 0.0
    ENTÃO NC_vb = 0.0
```

**Apresentação ao usuário (reaplicação com SMP <= 6,3):**
```
Recomendação principal:  NC_smp   (método SMP)
Referência informativa:  NC_vb    (método Saturação por Bases)
Nota ao usuário: "A definição do método a aplicar é decisão do técnico
                  responsável. Para primeira calagem, use sempre o valor SMP."
```

---

## Parte 5 — Aplicação do Limite Máximo e Modo de Aplicação

### RN-10: Limite Máximo para Aplicação Superficial

```
SE sistema_manejo = PD_CONSOLIDADO
    SE NC_smp > 5.0
        ENTÃO NC_final = 5.0
                emitir_alerta = "Dose calculada excede o limite de 5 t/ha para
                                  aplicação superficial. A correção completa poderá
                                  requerer reaplicação futura."
    SENÃO
        NC_final = NC_smp

SE sistema_manejo IN {CONVENCIONAL, PD_IMPLANTACAO, PD_COM_RESTRICAO}
    NC_final = NC_base * fator_manejo  /* sem limite máximo */
```

---

### RN-11: Modo de Aplicação por Sistema de Manejo

```
SE sistema_manejo = CONVENCIONAL
    ENTÃO modo_aplicacao = INCORPORADO
            profundidade_cm = 20

SE sistema_manejo = PD_IMPLANTACAO
    ENTÃO
        SE opcao_superficial_campo_natural = TRUE E SMP > 5.5
            ENTÃO modo_aplicacao = SUPERFICIAL
                    NC_final = tabela_smp_lookup(SMP, pH_alvo=6.0) * 0.5
                    /* metade da dose-base, não um quarto */
        SENÃO
            modo_aplicacao = INCORPORADO
            profundidade_cm = 20

SE sistema_manejo = PD_CONSOLIDADO
    ENTÃO modo_aplicacao = SUPERFICIAL
            /* NC_final já foi calculada com fator 1/4 e trava de 5 t/ha */

SE sistema_manejo = PD_COM_RESTRICAO
    ENTÃO modo_aplicacao = INCORPORADO
            profundidade_cm = 20
```

---

## Parte 6 — Conversão para Produto Real (Ajuste pelo PRNT)

### RN-12: Ajuste da Dose pelo PRNT do Produto

**Campos necessários:** `NC_final`, `PRNT`

```
NC_ajustada = NC_final * (100.0 / PRNT)
```

**Validação de entrada:**
```
SE PRNT <= 0 OU PRNT > 100
    ENTÃO lancar_erro("PRNT inválido: deve estar entre 1 e 100")
```

---

## Parte 7 — Fluxo Completo de Execução

```
INÍCIO
|
+-- Coletar: sistema_manejo, primeira_calagem, pH_agua, SMP, PRNT
|
+-- [DESVIO: SMP > 6.3?]
|   +-- SIM --> Coletar: MO, Al_trocavel
|   |           metodo_calc_roteado = POLINOMIAL
|   +-- NAO --> metodo_calc_roteado = SMP
|               SE reaplicação --> Coletar: V_atual, CTC_pH7
|
+-- [VERIFICAR GATILHO DE APLICAÇÃO]
|   +-- CONVENCIONAL / PD_IMPLANTACAO:
|   |   SE pH_agua >= 5.5 --> FIM (não aplicar)
|   |   SE pH_agua < 5.5  --> prosseguir para cálculo
|   |
|   +-- PD_CONSOLIDADO:
|       SE pH_agua >= 5.5 --> FIM (não aplicar)
|       SE pH_agua < 5.5  --> Coletar: Al_sat
|           SE V_atual >= 65 E Al_sat < 10 --> FIM (não aplicar)
|           SENÃO --> prosseguir para cálculo
|
+-- [CALCULAR NC_base]
|   +-- POLINOMIAL: NC_base = NC_pol_6_0(MO, Al_trocavel)
|   +-- SMP:        NC_base = tabela_smp_lookup(SMP, pH=6.0)
|                   SE reaplicação --> calcular também NC_vb (referência)
|
+-- [APLICAR FATOR DE MANEJO]
|   +-- CONVENCIONAL / PD_IMPLANTACAO --> x 1.0
|   +-- PD_CONSOLIDADO               --> x 0.25
|   +-- PD_COM_RESTRICAO             --> x 1.0, SMP médio das duas camadas
|
+-- [APLICAR TRAVA DE LIMITE]
|   SE PD_CONSOLIDADO E NC > 5.0 --> NC_final = 5.0 + alerta
|   SENÃO NC_final = NC calculado
|
+-- [CONVERTER PELO PRNT]
|   NC_ajustada = NC_final * (100 / PRNT)
|
+-- SAÍDA: NC_ajustada (t/ha produto real), modo_aplicacao, alertas
```

---

## Parte 8 — Casos de Teste Unitário

### CT-01: Lookup SMP — valor exato de tabela
- Entrada: SMP = 5.5, pH_alvo = 6.0
- Esperado: NC_base = 6.1 t/ha

### CT-02: Lookup SMP — limite inferior da tabela
- Entrada: SMP = 4.4 (ou menor), pH_alvo = 6.0
- Esperado: NC_base = 21.0 t/ha

### CT-03: Lookup SMP — sem necessidade
- Entrada: SMP = 7.1, pH_alvo = 6.0
- Esperado: NC_base = 0.0 t/ha

### CT-04: Fator 1/4 — PD Consolidado
- Entrada: SMP = 5.5, sistema = PD_CONSOLIDADO
- NC_base = 6.1 * 0.25 = 1.525 t/ha
- Esperado: NC_final = 1.525 t/ha

### CT-05: Trava máxima superficial — PD Consolidado
- Entrada: SMP = 4.4, sistema = PD_CONSOLIDADO
- NC_base = 21.0 * 0.25 = 5.25 → trava ativada
- Esperado: NC_final = 5.0 t/ha + alerta emitido

### CT-06: Trava de não-aplicação — V% e Al_sat no PD Consolidado
- Entrada: pH_agua = 5.2, V_atual = 66.0, Al_sat = 8.0, sistema = PD_CONSOLIDADO
- Passo 1: pH < 5.5 → Al_sat solicitado
- Passo 2: V_atual >= 65 E Al_sat < 10 → trava ativada
- Esperado: aplicar_calcario = FALSE

### CT-07: Encerramento precoce — pH >= 5.5 no PD Consolidado
- Entrada: pH_agua = 5.6, sistema = PD_CONSOLIDADO
- Esperado: aplicar_calcario = FALSE; Al_sat NÃO é solicitado

### CT-08: Saturação por bases — NC_vb (reaplicação)
- Entrada: V_atual = 55.0, CTC_pH7 = 10.0, pH_ref = 6.0 → V_desejada = 75.0
- NC_vb = ((75 - 55) / 100) * 10.0 = 2.0 t/ha
- Esperado: NC_vb = 2.0 t/ha

### CT-09: Saturação por bases — ajuste por CTC baixa
- Entrada: V_atual = 55.0, CTC_pH7 = 6.0 (< 7.5) → V_desejada = 70.0
- NC_vb = ((70 - 55) / 100) * 6.0 = 0.9 t/ha
- Esperado: NC_vb = 0.9 t/ha

### CT-10: Roteamento automático → Polinomial
- Entrada: SMP = 6.5, MO = 2.0, Al_trocavel = 0.5
- Roteado: POLINOMIAL (SMP > 6.3)
- NC_pol_6_0 = -0.516 + (0.805 * 2.0) + (2.435 * 0.5)
            = -0.516 + 1.610 + 1.2175 = 2.311 t/ha
- Esperado: NC_base = 2.311 t/ha; MO e Al_trocavel solicitados; V_atual NÃO solicitado

### CT-11: Polinomial — trava de zero
- Entrada: SMP = 6.9, MO = 0.3, Al_trocavel = 0.05
- NC_pol_6_0 = -0.516 + (0.805 * 0.3) + (2.435 * 0.05)
            = -0.516 + 0.2415 + 0.1218 = -0.153
- Esperado: NC_pol = 0.0 t/ha (trava de mínimo)

### CT-12: Ajuste PRNT
- Entrada: NC_final = 3.0 t/ha, PRNT = 75
- NC_ajustada = 3.0 * (100 / 75) = 4.0 t/ha
- Esperado: NC_ajustada = 4.0 t/ha

### CT-13: PD com Restrição — SMP médio das camadas
- Entrada: SMP_0_10 = 5.2, SMP_10_20 = 4.8, Al_sat_10_20 = 35.0, pH_agua = 5.0
- SMP_medio = (5.2 + 4.8) / 2 = 5.0
- NC_base = tabela_smp_lookup(5.0, 6.0) = 9.9 t/ha * 1.0
- Esperado: NC_final = 9.9 t/ha, modo = INCORPORADO

### CT-14: Roteamento — SMP exatamente em 6.3 → SMP (não polinomial)
- Entrada: SMP = 6.3
- Esperado: metodo_calc_roteado = SMP (condição é SMP > 6.3, não >=)

### CT-15: PD Implantação com opção superficial em campo natural
- Entrada: sistema = PD_IMPLANTACAO, opcao_superficial_campo_natural = TRUE, SMP = 5.8
- NC_base = tabela_smp_lookup(5.8, 6.0) = 4.2 t/ha * 0.5
- Esperado: NC_final = 2.1 t/ha, modo = SUPERFICIAL

### CT-16: Campos condicionais — polinomial não pede V_atual
- Entrada: SMP = 6.8, primeira_calagem = FALSE
- Esperado: sistema solicita MO e Al_trocavel; NÃO solicita V_atual e CTC_pH7
  (pois metodo_calc_roteado = POLINOMIAL, não SMP)

### CT-17: Al_sat calculado internamente (Opção 2 do campo B2)
- Entrada: Al_trocavel = 2.0 cmolc/dm³, CTC_pH7 = 10.0 cmolc/dm³
- Al_sat = (2.0 / 10.0) * 100 = 20.0%
- Esperado: Al_sat = 20.0%

### CT-18: Reaplicação com dois métodos — apresentação correta
- Entrada: SMP = 5.5, primeira_calagem = FALSE, V_atual = 55.0, CTC_pH7 = 10.0, sistema = CONVENCIONAL
- NC_smp = tabela(5.5, 6.0) = 6.1 t/ha (principal)
- NC_vb  = ((75 - 55) / 100) * 10.0 = 2.0 t/ha (referência)
- Esperado: NC_smp exibido como recomendação; NC_vb exibido como referência informativa

---

## Parte 9 — Travas e Limites Absolutos

| ID | Regra | Valor / Condição |
|---|---|---|
| TRAVA-01 | Dose máxima em aplicação superficial (PRNT 100%) | 5,0 t/ha |
| TRAVA-02 | NC mínima (qualquer método ou cenário) | 0,0 t/ha |
| TRAVA-03 | PD Consolidado: não aplicar se V>=65% e Al_sat<10% | — |
| TRAVA-04 | Primeira calagem: usar SMP, nunca Saturação por Bases | — |
| TRAVA-05 | SMP > 6,3: usar equação polinomial obrigatoriamente | SMP > 6,3 |
| TRAVA-06 | SMP = 6,3: usar SMP (limite esta em >, não >=) | SMP = 6,3 → SMP |
| TRAVA-07 | PD Implantação superficial campo natural (SMP>5,5): fator 0,5 (não 0,25) | — |
| TRAVA-08 | NC_pol < 0 → forçar para 0,0 | — |
| TRAVA-09 | Al_sat solicitado somente após pH_agua < 5.5 em PD Consolidado | — |
| TRAVA-10 | V_atual e CTC_pH7 nunca solicitados em primeira calagem | — |
| TRAVA-11 | V_atual e CTC_pH7 nunca solicitados quando metodo = POLINOMIAL | — |

---

## Parte 10 — Validações de Entrada

```
ASSERT SMP: intervalo [4.4, 7.1]
    SE SMP < 4.4 → usar NC da linha <=4.4 (máximo da tabela)
    SE SMP > 7.1 → NC_base = 0.0

ASSERT pH_agua: intervalo [3.5, 8.0]
    Fora do intervalo → lançar erro "pH inválido"

ASSERT V_atual: intervalo [0.0, 100.0]

ASSERT Al_sat: intervalo [0.0, 100.0]

ASSERT CTC_pH7: > 0.0

ASSERT MO: [0.0, 100.0]

ASSERT Al_trocavel: >= 0.0

ASSERT PRNT: intervalo (0.0, 100.0]
    SE PRNT <= 0 ou PRNT > 100 → lançar erro "PRNT inválido"
```
