# Manual de Calagem e Adubação para os Estados do RS e de SC (2016)
# Capítulo 5 — Diagnóstico da acidez e recomendação da calagem
## Transcrição técnica para auditoria (fonte da verdade)

---

## 0. Convenções desta transcrição

**Fonte.** Arquivo anexado com 23 páginas, que correspondem às páginas impressas **65 a 87** do manual. Capítulo "DIAGNÓSTICO DA ACIDEZ E RECOMENDAÇÃO DA CALAGEM", "Atualizado por: Danilo Rheinheimer dos Santos, João Kaminski, Gustavo Brunetto, Carlos Alberto Ceretta, Jackson Ernani Fiorin, Leandro Souza da Silva, Luciano Colpo Gatiboni" (p. 65).

**Paginação.** "p. NN" é sempre o número impresso no rodapé do manual. Página do PDF anexado = p. − 64 (ex.: p. 70 = página 6 do PDF).

**Método de leitura.**
- A camada de texto do PDF converte os sinais "≥" e "≤" em "=". Em todas as ocorrências (p. 69, 70, 74, 75, 77, 78, 80, 81, 82, 83, 86) o sinal correto foi conferido na imagem da página e está transcrito aqui como ≥ ou ≤.
- A Tabela 5.1 (p. 68) foi conferida por imagem rasterizada da página.
- As Tabelas 5.3 a 5.7 estão impressas na horizontal e a camada de texto delas está truncada; foram transcritas a partir das imagens das páginas.
- Números com vírgula decimal, como no manual. Erros de digitação do original foram mantidos (ex.: "ocorre a aumento natural", "produtividade da culturas").
- Trechos entre aspas "…" são transcrição literal. O restante é reorganização fiel, sem acréscimo de conteúdo.

**Marcadores.**
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — lacuna: o texto não define a regra. Cada uma tem um ID `LAC-xx` e está consolidada na Seção 9.
- 🔀 **INCONSISTÊNCIA NO MANUAL** — dois trechos do próprio manual divergem. Cada uma tem um ID `INC-xx` e está consolidada na Seção 10. Nenhuma foi "resolvida" nesta transcrição.

**Prefixos de identificador.**

| Prefixo | Uso |
|---|---|
| VAR-xx | Variável de entrada/saída |
| MET-xx | Método de cálculo da NC ou de ajuste de dose |
| TAB-xx | Tabela do manual |
| RN-xx | Regra atômica (decisão, dose, modo, amostragem) |
| TRV-xx | Trava / condição de não aplicação / limite |
| CE-xx | Caso especial ou exceção |
| NT-xx | Nota técnica / observação do manual |
| LAC-xx | Lacuna (não explícito no manual) |
| INC-xx | Inconsistência interna do manual |

**Notação "SMP" nas tabelas de critérios.** Nas Tabelas 5.3 a 5.7 a coluna "Quantidade de calcário" usa expressões como "1 SMP para pH_água 6,0" e "¼ SMP para pH_água 6,0". O próprio manual explica o significado: "¼ (uma quarta parte) do que o índice SMP indicar para elevar o pH do solo até 6,0 (Tabela 5.2)" (p. 73). Portanto "k SMP para pH_água X" = k × (dose da Tabela 5.2, coluna "pH desejado" = X, na linha do índice SMP da amostra).

---

## 1. Escopo e objetivo do capítulo anexado

### 1.1 O que cobre

| Item | Título (como no manual) | Páginas |
|---|---|---|
| (abertura) | Diagnóstico da acidez e recomendação da calagem | 65 |
| 5.1 | Acidez natural e reacidificação do solo | 65–67 |
| 5.2 | Recomendação de calcário (inclui Tabela 5.1) | 67–69 |
| 5.2.1 | Definição de dose de calcário (Tabela 5.2, método V%, equações polinomiais) | 70–72 |
| 5.2.2 | Tomada de decisão, definição da dose e forma de aplicação do calcário para as culturas produtoras de grãos (Tabela 5.3) | 72–75 |
| 5.2.3 | … para as espécies forrageiras (Tabela 5.4) | 76–78 |
| 5.2.4 | … para produção de hortaliças, tubérculos e raízes (Tabela 5.5) | 79–81 |
| 5.2.5 | … para frutíferas e espécies florestais (Tabela 5.6, equação da faixa) | 82–84 |
| 5.2.6 | … para plantas medicinais, aromáticas e condimentares (Tabela 5.7) | 84–86 |
| 5.2.7 | … para espécies ornamentais (Tabela 5.7) | 85–86 |
| 5.2.8 | … para outras culturas comerciais (Tabela 5.7) | 85–86 |
| 5.3 | Frequência de reaplicação de calcário | 87 |

**Objetivo declarado (p. 65).** Os solos do RS e de SC "em seu estado natural, são predominantemente ácidos"; "a acidificação do solo cultivado é um processo contínuo"; "O calcário agrícola é o principal produto utilizado para a correção da acidez e a prática de sua aplicação ao solo é denominada de calagem."

**Objetivo da recomendação (p. 67).** "proporcionar um ambiente adequado de crescimento do sistema radicular, diminuindo a atividade de elementos potencialmente tóxicos para as plantas cultivadas, como o Al e o Mn, e favorecendo a disponibilidade de elementos essenciais à nutrição de plantas."

### 1.2 O que fica de fora destas páginas

- **Capítulo 3** (amostragem), citado na p. 73 para o monitoramento da camada de 10 a 20 cm. Não anexado.
- **Capítulo 6** (fósforo / fosfatagem), citado na p. 74. Não anexado.
- Definição numérica de "teor crítico" de P e de K (citado nas notas das Tabelas 5.3 a 5.6).
- Fórmulas para calcular V%, saturação por Al, CTC pH 7,0 ou H+Al a partir de dados de laboratório.
- Equação de estimativa de H+Al a partir do índice SMP (o texto cita "Quaggio et al., 1986", mas não traz a equação).
- Especificação de corretivos (cálculo do PRNT, granulometria, teor de MgO do dolomítico, "extrafino").
- Gessagem, calcário em mistura com fertilizantes, época/antecedência quantificada da aplicação.
- **Nenhum exemplo numérico** de cálculo aparece nas páginas anexadas.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-52`: a p. 87 termina o item 5.3 com um único parágrafo. Não é possível saber, pelas páginas anexadas, se o capítulo continua na p. 88.

---

## 2. Variáveis de entrada (e de saída)

"Camada" = profundidade de amostragem à qual a variável se refere, conforme as colunas "Amostragem do solo (cm)" das Tabelas 5.3–5.7 ou o texto.

| ID | Nome (como no manual) | Símbolo / sigla no manual | Unidade | Faixa válida declarada | Camada de amostragem | Páginas |
|---|---|---|---|---|---|---|
| VAR-01 | pH em água | "pH", "pH em água", "pH_água" | adimensional | Não declarada. Pontos de corte usados: < 5,5; < 6,0. Alvos: 5,5; 6,0; 6,5 | 0–20 cm (convencional, implantação de PD, culturas "qualquer um"); 0–10 cm (PD consolidado; campo natural); 10–20 cm (PD consolidado com restrições) | 67, 69, 70, 72–86 |
| VAR-02 | Índice SMP | "índice SMP", "SMP" | adimensional | Não declarada. Tabela 5.2 cobre "≤ 4,4" até 7,1, em passos de 0,1 | 0–20 cm (base da Tabela 5.2); 0–10 cm no PD consolidado (pela coluna Amostragem); média de 0–10 e 10–20 no reinício do PD | 70–75 |
| VAR-03 | Saturação por bases do solo | "V%", "V", "V2" | % | Não declarada. Pontos de corte: 40% e 65% | Conforme coluna Amostragem da linha da tabela (0–20 ou 0–10). Na trava do PD consolidado: 0–10 cm (p. 73) | 71, 73–86 |
| VAR-04 | Saturação por bases desejada | "V1" | % | "65, 75 ou 85%" (p. 71); 40% nos casos de fornecimento de Ca e Mg | — | 71, 74–86 |
| VAR-05 | Capacidade de troca de cátions estimada a pH 7,0 | "CTC", "CTCpH 7,0", "CTCpH7", "CTC_pH7,0" | cmol_c/dm³ (unidade citada no parágrafo dos ajustes de V%, p. 71) | Não declarada. Limiares de ajuste: < 7,5 e > 15 cmol_c/dm³ | Mesma camada da linha da tabela | 71, 75, 78, 81, 83, 86 |
| VAR-06 | Acidez potencial | "H+Al" | ⚠️ não informada | Não declarada | — | 66, 71 |
| VAR-07 | Al trocável | "Al", "Al trocável", "Al+3 - livre" | cmol_c/dm³ (p. 72) | Não declarada | 0–20 cm (equações polinomiais "para corrigir a camada de 0 a 20 cm") | 65, 69, 72, 82 |
| VAR-08 | Saturação por Al | "saturação por Al", "saturação por Al na CTC", "Al%", "Al" (na Tab. 5.3) | % | Não declarada. Pontos de corte: < 10%; > 10%; ≥ 30% | 0–10 cm (trava do PD, p. 73); 10–20 cm (restrições, p. 74); 0–20 cm (grupos pH 5,5) | 69, 73–75, 79, 82–83, 86 |
| VAR-09 | Teor de matéria orgânica | "MO" | % (p. 72: "em porcentagem") | Não declarada | 0–20 cm (equações polinomiais) | 72 |
| VAR-10 | Ca trocável | "Ca trocável", "Ca" | cmol_c/dm³ | Não declarada. Ponto de corte: ≥ 4,0 | Mesma camada da linha da tabela | 74, 77, 78, 80–83, 86 |
| VAR-11 | Mg trocável | "Mg trocável", "Mg" | cmol_c/dm³ | Não declarada. Ponto de corte: ≥ 1,0 | Mesma camada da linha da tabela | 74, 77, 78, 80–83, 86 |
| VAR-12 | Poder relativo de neutralização total do calcário | "PRNT" | % | Não declarada. Doses das tabelas/equações expressas para "PRNT 100%" | — | 70–72, 75, 78, 81, 83, 84 |
| VAR-13 | Largura da faixa de aplicação do calcário | "LFA" | m | Não declarada | — | 84 |
| VAR-14 | Distância entre as linhas de plantio | "DLP" | m | Não declarada | — | 84 |
| VAR-15 | Disponibilidade/teor de P | "P", "disponibilidade de P", "teor crítico" | ⚠️ não informada nestas páginas (Cap. 6) | — | 10–20 cm (critério de restrição, p. 74); média de 0–10 e 10–20 (fosfatagem, p. 74) | 73–75, 78, 81, 83 |
| VAR-16 | Disponibilidade/teor de K | "K", "teor crítico" | ⚠️ não informada nestas páginas | — | — | 75, 78, 81, 83 |
| VAR-17 | Sistema de manejo do solo | categórica: "Convencional"; "Plantio direto" → "Implantação do sistema" / "Sistema consolidado, sem restrições na camada de 10 a 20 cm" / "Sistema consolidado, com restrições na camada de 10 a 20 cm"; "Qualquer um"; "Implantação da forrageira"; "Cultivo convencional e implantação do plantio direto"; reinício do PD; plantio em covas; cultivo em vasos | — | — | — | 72–86 |
| VAR-18 | Cultura / grupo de culturas | categórica (Tabela 5.1 e Tabelas 5.3–5.7) | — | — | — | 67–86 |
| VAR-19 | Sistema de cultivo do arroz irrigado | categórica: "Semeadura em solo seco" (irrigação inicia 20–30 dias após a emergência); "Pré-germinado ou transplante de mudas" | — | — | — | 74, 75 |
| VAR-20 | Área a corrigir (frutíferas/florestais) | categórica: "Área total ou faixa de plantio" | — | — | — | 83, 84 |
| VAR-21 | Condição da área (qualitativa) | produtividade abaixo da média local (especialmente em anos de estiagem); compactação restringindo crescimento radicular; área de PD não implantada com correção 0–20 cm; primeira calagem vs. reaplicação; solo arenoso e/ou pobre em MO ("baixo poder tampão"); campo natural de "baixa acidez potencial"; solos degradados ou nunca corrigidos; solos orgânicos (arroz) | — | Sem limiares numéricos, exceto os citados nas regras | — | 71–75, 85 |
| VAR-22 | Uso de fosfatos naturais | booleana (campo natural) | — | — | — | 77, 78 |
| VAR-23 | Massa do substrato do vaso | — | ⚠️ não informada | — | — | 85 |
| VAR-24 | Fase de produção / ciclo longo (frutíferas) | categórica | — | — | — | 83 |
| **Saídas** | | | | | | |
| VAR-25 | Necessidade de calcário | "NC" | t/ha, calcário PRNT 100%, para corrigir a camada de 0 a 20 cm | — | — | 70–72 |
| VAR-26 | Dose de calcário (faixa de plantio) | "DC" | t/ha | — | — | 84 |
| VAR-27 | Modo de aplicação | "Incorporado" / "Superficial"; profundidade (0–20 cm; ≥ 20 cm; até 30 cm) | — | — | — | 69, 72–86 |

⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-03`: nenhuma variável tem faixa de validade, precisão (casas decimais) ou regra de rejeição de valores declarada.

⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-24`: as páginas não definem como calcular a saturação por Al (a expressão "saturação por Al na CTC" não diz se é CTC efetiva ou CTC pH 7,0), nem como calcular V%. Para V%, o texto diz apenas "expressa no laudo de análise" (p. 71).

⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-54`: a coluna "Tomada de decisão" das Tabelas 5.3–5.7 escreve apenas "pH". O pH em água é citado no texto (p. 69: "valor do pH em água é menor que 5,5") e nos títulos/colunas de dose ("pH_água"). O manual não diz explicitamente que o "pH" da coluna de decisão é pH em água.

---

## 3. Métodos de determinação da NC

### MET-01 — Índice SMP (Tabela 5.2) — p. 70

- **RN-11 (p. 70).** "Neste Manual, a necessidade de calcário de um solo é preferencialmente estimada pelo índice SMP." As doses (PRNT 100%) para a camada 0–20 cm atingir pH de referência 5,5; 6,0 ou 6,5 estão na Tabela 5.2 (ver `TAB-02`).
- **Entrada:** índice SMP (VAR-02); pH desejado ∈ {5,5; 6,0; 6,5}.
- **Saída:** NC em t/ha, calcário com PRNT 100%, camada de 0 a 20 cm.
- **Fórmula:** não há fórmula; consulta direta à tabela.
- **Exemplo numérico no manual:** nenhum.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-01`: a tabela traz linhas em passos de 0,1. O texto não diz o que fazer com um SMP fora desse passo (ex.: 5,63 — arredondar, truncar ou interpolar). O mesmo problema surge com o SMP médio de duas camadas (ex.: média 5,45) no reinício do PD (`RN-37`).
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-02`: a primeira linha é "≤ 4,4" (cobre todo valor abaixo). A última linha é 7,1 (dose 0 nas três colunas). Não há linha "≥ 7,1" nem instrução para SMP > 7,1.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-60`: não há dose mínima operacional (ex.: 0,2 t/ha) abaixo da qual a aplicação seja dispensada.

### MET-02 — Saturação por bases (V%) com V1 = 65 / 75 / 85% — p. 71–72

- **RN-12 (p. 71).** "Alternativamente ao índice SMP, a dose de calcário também pode ser estabelecida pela saturação por bases (V%), mantendo a estimativa da acidez potencial (H+Al) via índice SMP (Quaggio et al., 1986)."
- **NT-01 (p. 71).** "Embora ainda não tenha sido calibrado o valor da saturação por bases das diferentes culturas quando cultivadas em solos do RS e de SC, neste Manual se assume uma provável correspondência entre o valor do pH de referência das culturas com o valor V%".
- **RN-13 (p. 71) — correspondência pH → V1:**

| pH de referência | V1 (saturação por bases desejada) |
|---|---|
| 5,5 | 65% |
| 6,0 | 75% |
| 6,5 | 85% |

- **RN-14 (p. 71) — ajuste de V1 pela CTC.** "Esses valores de saturação por bases representam valores médios de vários solos e, portanto, são aproximados. Em geral, eles podem ser cerca de cinco pontos percentuais menores em solos com baixos valores de CTCpH7 (< 7,5 cmol_c/dm³) e em torno de cinco pontos percentuais maiores em solos com altos valores de CTCpH7 (> 15 cmol_c/dm³)."

| CTC pH 7,0 | Ajuste de V1 (conforme texto) |
|---|---|
| < 7,5 cmol_c/dm³ | "cerca de cinco pontos percentuais menores" |
| > 15 cmol_c/dm³ | "em torno de cinco pontos percentuais maiores" |
| demais | sem ajuste mencionado |

- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-08`: (a) o texto usa "podem ser", "cerca de" e "em torno de" — não diz se o ajuste é obrigatório nem se o valor é exatamente 5; (b) nos limites exatos (CTC = 7,5 e CTC = 15), a leitura estrita das desigualdades (< e >) indica "sem ajuste", mas isso não está dito; (c) não diz se o ajuste também vale para V1 = 40% (fornecimento de Ca e Mg).

- **RN-15 (p. 71) — fórmula.** A partir do laudo (V% e CTCpH 7,0) e do V% correspondente ao pH de referência do grupo de culturas:

```
NC = [(V1 - V2) / 100] x CTCpH 7,0
```

"Em que: NC= necessidade de calcário (PRNT 100%) em t/ha, para corrigir a camada de 0 a 20 cm; V1= saturação por bases desejada (65, 75 ou 85%); V2= saturação por bases do solo, expressa no laudo de análise; CTC= capacidade de troca de cátions estimada a pH 7,0 (CTCpH 7,0)."

- **Exemplo numérico no manual:** nenhum.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-10`: a definição das variáveis da fórmula não traz a unidade da CTC. O cmol_c/dm³ só aparece no parágrafo anterior (ajustes de V1). A fórmula resulta diretamente em t/ha, sem fator de conversão escrito.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-09`: o texto diz que se mantém "a estimativa da acidez potencial (H+Al) via índice SMP", mas não apresenta a equação SMP → H+Al. Também não explica como essa estimativa entra na fórmula, que usa apenas V2 e CTCpH 7,0 "expressa no laudo".
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-11`: não diz o que fazer quando V2 ≥ V1 (resultado zero ou negativo).
- **RN-16 (p. 71) — comparação com SMP.** "A quantidade de calcário definida pelo cálculo da saturação por bases ou pelo índice SMP usando a Tabela 5.2 são semelhantes, podendo haver maiores diferenças em solos com alta acidez potencial e/ou elevados teores de Ca e de Mg. Nesses casos, a saturação por bases tende a indicar uma dose menor de calcário que o índice SMP. Isso pode significar uma elevação de pH aquém do desejado inicialmente (sem necessariamente afetar as produtividades das culturas se o valor for suficiente para neutralizar o Al tóxico) e/ou um menor efeito residual da calagem."
- **RN-19 (p. 71–72) — ajuste para aplicação superficial.** "…não houve calibração para estabelecimento das saturações por bases desejadas pelas culturas e que a dose estimada pela equação corresponde uma correção da camada de 0 a 20 cm sendo, portanto, necessário um ajuste da dose, caso a aplicação seja em superfície (usar os mesmos fatores empregados para o SMP eventualmente expressos nas Tabelas 5.3 a 5.7 dos itens 5.2.3 a 5.2.8)." (sobre a referência "itens 5.2.3 a 5.2.8", ver 🔀 `INC-06`).

### MET-03 — Saturação por bases para fornecimento de Ca e Mg (V1 = 40%) — p. 74–86

Usado nos grupos "sem pH de referência": arroz irrigado pré-germinado ou transplante de mudas; campo natural; mandioca; espécies florestais; citronela e chá.

```
NC=(40-V%)/100 *CTCpH7,0
```

(grafia exata das Tabelas 5.3, 5.4, 5.5, 5.6 e 5.7). É a fórmula do MET-02 com V1 = 40.

- Condição de uso nas tabelas: "V ≤ 40%". No texto: "saturação por bases for menor do que 40%". 🔀 `INC-04`.
- Exceção de não aplicação: "Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³" (ver `TRV-03`).
- Corretivo indicado no texto: "calcário dolomítico como fonte desses nutrientes" (p. 74, 77, 80, 82).
- **Exemplo numérico no manual:** nenhum.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-30`: no campo natural a amostragem é de 0 a 10 cm e a aplicação é superficial (Tab. 5.4). A p. 72 diz que a dose por V% corresponde à camada 0–20 e exige ajuste quando superficial. A Tab. 5.4, porém, não traz fator para essa linha (ver 🔀 `INC-15`).

### MET-04 — Equações polinomiais (MO e Al trocável) — p. 72

- **RN-20 (p. 72) — quando usar.** "Especificamente nos casos de solos com baixo poder tampão (arenosos e/ou pobres em matéria orgânica, geralmente com Índice SMP maior que 6,3), o índice SMP pode subestimar a acidez potencial e, consequentemente, indicar uma dose de calcário insuficiente para elevar o pH até o valor desejado, motivo pelo qual recomenda-se usar equações polinomiais que levam em conta o teor de matéria orgânica e de Al trocável para definir a dose de calcário (t/ha, PRNT 100%)".
- **RN-21 (p. 72) — fórmulas (as três, na íntegra):**

```
NC pH 5,5 = -0,653 + 0,480MO + 1,937Al
NC pH 6,0 = -0,516 + 0,805MO + 2,435Al
NC pH 6,5 = -0,122 + 1,193MO + 2,713Al
```

"Em que: NC= necessidade de calcário (PRNT 100%), em t/ha, para corrigir a camada de 0 a 20 cm aos pH de referência de 5,5, 6,0 e 6,5; MO e Al = representam, respectivamente, o teor de matéria orgânica, em porcentagem, e o Al trocável do solo, em cmol_c/dm³."

| Alvo | Intercepto | Coef. MO (%) | Coef. Al (cmol_c/dm³) |
|---|---|---|---|
| pH 5,5 | -0,653 | 0,480 | 1,937 |
| pH 6,0 | -0,516 | 0,805 | 2,435 |
| pH 6,5 | -0,122 | 1,193 | 2,713 |

- **Exemplo numérico no manual:** nenhum.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-12`: "geralmente com Índice SMP maior que 6,3" descreve o solo típico. O texto não diz que SMP > 6,3 é o gatilho objetivo. "Baixo poder tampão", "arenosos" e "pobres em matéria orgânica" não têm limiares numéricos (argila, MO).
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-13`: não declara faixa de validade de MO e Al. Também não define prioridade entre esta regra e `RN-17` ("solos que vão receber calcário pela primeira vez devem ter a dose estimada pelo índice SMP") quando um solo de baixo poder tampão recebe calcário pela primeira vez.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-11` (repetida): com MO e Al baixos, as equações podem dar valor negativo. Não há instrução para esse caso.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-14`: a instrução de ajustar a dose para aplicação superficial com os fatores do SMP (p. 72) é escrita para o método V%, e não para as equações polinomiais. As páginas também não dizem se MO e Al se referem à camada 0–20 cm (o texto só diz que a NC é "para corrigir a camada de 0 a 20 cm").

### MET-05 — Escolha / média entre critérios (reaplicações) — p. 71

- **RN-17 (p. 71).** "…solos que vão receber calcário pela primeira vez devem ter a dose de calcário estimada pelo índice SMP".
- **RN-18 (p. 71).** "…para reaplicações de calcário, a definição da dose a aplicar pelos diferentes critérios, ou mesmo por sua média, é uma decisão do técnico que efetua a recomendação."
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-15`: não diz quais critérios entram na média (SMP, V%, polinomial), se a média é simples ou ponderada, nem qual é o padrão se o técnico não escolher.

### MET-06 — Fatores de ajuste da dose (consolidação do que está escrito)

| Fator / operação | Onde se aplica | pH-alvo da dose | Fonte |
|---|---|---|---|
| 1 × dose SMP | Convencional; implantação de PD; PD com restrições (reinício); alfafa; aspargo; forrageiras perenes (implantação); forrageiras anuais convencional/implantação; demais olerícolas convencional/implantação; grupos pH 5,5; frutíferas; medicinais; ornamentais; cana e tabaco | conforme a linha | Tab. 5.3–5.7 |
| ¼ × dose SMP | PD consolidado: grãos; forrageiras anuais; demais olerícolas; medicinais/aromáticas/condimentares | 6,0 | Tab. 5.3, 5.4, 5.5; p. 73, 76, 79, 85 |
| ½ × dose SMP | Campo natural de baixa acidez potencial (SMP > 5,5) com início do PD por aplicação superficial | 6,0 | p. 73 |
| ½ × dose SMP | Reaplicação em "Demais frutíferas" de ciclo longo, na fase de produção, superficial em área total | 5,5 | Tab. 5.6, nota (3) |
| 1,5 × dose da camada 0–20 cm | Incorporação até 30 cm: macieira e oliveira; demais frutíferas; roseira de corte | conforme a linha | p. 82, 85; Tab. 5.6 nota (5); Tab. 5.7 nota (2) |
| SMP médio das camadas 0–10 e 10–20 cm | Reinício do PD (PD consolidado com restrições) | 6,0 | p. 74; Tab. 5.3 nota (7) |
| × (LFA/DLP) × (100/PRNT) | Aplicação restrita à faixa de plantio (frutíferas/florestais) | — | p. 84 (MET-07) |
| Limite 5 t/ha (PRNT 100%) | Aplicação superficial (ver `TRV-08`) | — | Tab. 5.3 (5); 5.4 (5); 5.5 (2); 5.6 (3) |
| Ajuste à massa do substrato | Ornamentais em vasos | — | p. 85 (sem fórmula) |

- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-04`: não há regra de arredondamento da dose final (após ¼, ½, 1,5×, PRNT, LFA/DLP).
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-05`: a conversão da dose "PRNT 100%" para o produto comercial (divisão por PRNT/100) só aparece escrita na equação da faixa de plantio (p. 84). Para os demais casos, as páginas dizem apenas que as doses são para "PRNT 100%", sem escrever a conversão.

### MET-07 — Dose na faixa de plantio (culturas perenes de grande espaçamento) — p. 84

- **RN-69 (p. 84).** "Mesmo para as culturas perenes com grande espaçamento entre linhas, o mais recomendado é a aplicação do corretivo da acidez na área total, até porque é possível cultivar espécies anuais ou semiperenes nas entrelinhas, especialmente, durante a formação do pomar ou da floresta. Opcionalmente, a aplicação de calcário pode se restringir apenas a faixa de plantio e sua incorporação até 20 cm de profundidade, com o ajuste correspondente da dose em função da área de aplicação pela equação abaixo:"

```
DC (t/ha) = NC x (LFA/DLP) x (100/PRNT)
```

"Em que: DC = dose de calcário (t/ha); NC = necessidade de calcário para a cultura (t/ha); LFA = largura da faixa de aplicação do calcário (m); DLP = distância entre as linhas de plantio (m); PRNT = poder relativo de neutralização total do calcário (%)."

- **RN-70 (p. 84).** "Há situações, como no cultivo do eucalipto, em que o corretivo pode ser aplicado em área total, mas incorporado apenas na faixa de cultivo e, neste caso, não é necessário utilizar a equação acima para calcular a dose de calcário."
- **Exemplo numérico no manual:** nenhum.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-39`: a definição de NC nesta equação ("necessidade de calcário para a cultura (t/ha)") não diz "PRNT 100%", embora a equação aplique 100/PRNT. Também não diz se DC é por hectare da área total.
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-38`: não diz como combinar esta equação (incorporação "até 20 cm") com o fator 1,5× da incorporação até 30 cm.

### MET-08 — Plantio em covas e cultivo em vasos (apenas qualitativo)

- Covas (medicinais etc., p. 85): calcário "aplicado em toda a área e incorporado na cova, por ocasião do seu preparo". ⚠️ `LAC-47`: não há fórmula de dose por cova.
- Vasos (ornamentais, p. 85): "o substrato deve ser corrigido seguindo as mesmas recomendações feitas para o cultivo em solo, ajustando a quantidade de calcário à massa do substrato do vaso". ⚠️ `LAC-48`: não há fórmula de conversão de t/ha para massa de substrato.

### 3.9 Regras de roteamento entre métodos (consolidadas)

| ID | Condição | Método | Página |
|---|---|---|---|
| RN-11 | Regra geral | SMP (MET-01) "preferencialmente" | 70 |
| RN-12 | Alternativa geral | V% (MET-02) | 71 |
| RN-17 | Solo que recebe calcário pela primeira vez | SMP (MET-01) — "devem" | 71 |
| RN-18 | Reaplicação | SMP, V% ou média — "decisão do técnico" | 71 |
| RN-20 | Solo de baixo poder tampão (arenoso e/ou pobre em MO, geralmente SMP > 6,3) | Polinomial (MET-04) — "recomenda-se" | 72 |
| RN-04 | Culturas não responsivas à elevação do pH ("sem pH de referência") | V% para 40% (MET-03) | 67; Tab. 5.3–5.7 |
| — | Faixa de plantio (frutíferas/florestais) | MET-07 sobre a NC | 84 |

⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-16`: não há ordem de prioridade escrita quando mais de uma condição de roteamento é verdadeira ao mesmo tempo (ex.: primeira calagem em solo de baixo poder tampão; reaplicação em solo de baixo poder tampão).

---

## 4. Tabelas de referência (na íntegra)

### TAB-01 — Tabela 5.1 (p. 68)

**Título:** "Tabela 5.1. Valor de pH de referência de algumas culturas"

| pH referência | Culturas |
|---|---|
| pH 6,5 | Alfafa, aspargo, macieira, oliveira, piretro. |
| pH 6,0 | Abacateiro, abóbora, abobrinha, alcachofra, alface, alho, almeirão, ameixeira, amendoim, arroz de sequeiro, aveia, bananeira, batata-doce, berinjela, beterraba, brócolis, cana-de-açúcar, camomila, canola, capim-limão, caquizeiro, cebola, cenoura, centeio, cevada, chicória, chuchu, citros, consorciação de gramíneas e leguminosas de estação fria, consorciação de gramíneas e leguminosas de estação quente, couve-flor, crisântemo, ervilha, ervilha forrageira, ervilhaca, estévia, feijão, figueira, gengibre, girassol, gramíneas forrageiras de estação fria, gramíneas forrageiras de estação quente, hortelã, leguminosas forrageiras de estação fria, leguminosas forrageiras de estação quente, linho, mandioquinha-salsa, maracujazeiro, melancia, melão, milho, milho pipoca, moranga, morangueiro, nabo, nabo forrageiro, nectarineira, nogueira-pecã, painço, palma-rosa, pepino, pereira, pessegueiro, pimentão, quivizeiro, rabanete, repolho, roseira de corte, rúcula, soja, sorgo, tabaco, tomate, tremoço, trigo, triticale, urucum, vetiver e videira. |
| pH 5,5 | Alfavaca, amoreira-preta, arroz irrigado no sistema de semeadura em solo seco, batata, calêndula, camomila, cardamomo, carqueja, chá, citronela-de-Java, coentro, cúrcuma, erva-doce, funcho, guaco, manjericão, mirtilo, palmeira-juçara, palmeira-real, pupunheira e salsa. |
| Sem pH de referência⁽¹⁾ | Arroz irrigado no sistema pré-germinado ou com transplante de mudas, araucária, acácia negra, bracatinga, cedro australiano, erva-mate, eucalipto, pinus, mandioca, e pastagem natural. |

**Nota (1):** "No cultivo de arroz irrigado nos sistema pré-germinado ou com transplante de mudas ocorre a aumento natural de pH e a calagem pode ser efetuada para fornecer Ca e Mg. As demais culturas são tolerantes a acidez do solo e não possuem um pH de referência, mas também podem receber calcário para o adequado suprimento de Ca e Mg."

Contagem de itens: pH 6,5 = 5 itens; pH 6,0 = 79 itens; pH 5,5 = 21 itens; sem pH = 10 itens.

🔀 `INC-01`: **camomila** aparece nos grupos pH 6,0 e pH 5,5.
🔀 `INC-02`: **batata-doce** está no grupo pH 6,0 aqui, mas no grupo pH 5,5 na p. 79 e na Tabela 5.5.
🔀 `INC-03`: **chá** e **citronela-de-Java** estão no grupo pH 5,5 aqui, mas "sem pH de referência" (V ≤ 40%) na p. 84 e na Tabela 5.7.

**Regras associadas (p. 67):**
- **RN-02.** "Desde meados dos anos 70 se conhece que as plantas de interesse agropecuário podem ser agrupadas por seu pH de referência (pH do solo mais adequado) (Tabela 5.1)."
- **RN-05.** "O valor do pH de referência da Tabela 5.1 pode ser utilizado em uma sequência de rotação de culturas adotada em uma determinada área. Nessa situação, deve-se considerar o pH de referência da cultura mais sensível (a que exigir o pH mais elevado), para se manter o potencial de rendimentos de todas as culturas a serem implantadas na área." (exceção: batata, `CE-10`; ver 🔀 `INC-20`)

### TAB-02 — Tabela 5.2 (p. 70)

**Título:** "Tabela 5.2. Quantidades de calcário (PRNT 100%) necessárias para elevar o pH em água do solo da camada de 0 a 20 cm, a 5,5, 6,0 e 6,5, estimadas pelo índice SMP ⁽¹⁾"

Unidade das três colunas de dose: "t/ha ⁽²⁾".

| Índice SMP | pH desejado 5,5 (t/ha) | pH desejado 6,0 (t/ha) | pH desejado 6,5 (t/ha) |
|---|---|---|---|
| ≤ 4,4 | 15,0 | 21,0 | 29,0 |
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
| 6,7 | 0 | 0,5 | 1,2 |
| 6,8 | 0 | 0,3 | 0,8 |
| 6,9 | 0 | 0,2 | 0,5 |
| 7,0 | 0 | 0 | 0,2 |
| 7,1 | 0 | 0 | 0 |

**Nota (1):** "A partir de dados de Murdock et al. (1969); Kaminski (1974); Scherer (1976); Ernani & Almeida (1986); Anjos et al. (1987) e Ciprandi et al. (1994)."
**Nota (2):** "Calcário com PRNT 100%."

28 linhas. Lacunas associadas: `LAC-01`, `LAC-02`, `LAC-60`.

### TAB-03 — Tabela 5.3 (p. 75)

**Título:** "Tabela 5.3. Critérios para a indicação da necessidade e da quantidade de corretivos da acidez para culturas de grãos"

Observação de leiaute: no original, as células "Plantio direto", "Arroz irrigado" e "6,0" (pH de referência das quatro primeiras linhas) são mescladas. Aqui estão repetidas em cada linha.

| # | Sistema de manejo do solo ou cultura | Condição da área | Amostragem do solo (cm) | pH de referência | Tomada de decisão | Quantidade de calcário | Modo de aplicação |
|---|---|---|---|---|---|---|---|
| 5.3-a | Convencional | Em todos os casos | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado⁽²⁾ |
| 5.3-b | Plantio direto | Implantação do sistema | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado⁽²⁾ |
| 5.3-c | Plantio direto | Sistema consolidado, sem restrições na camada de 10 a 20 cm | 0 a 10⁽⁴⁾ | 6,0 | pH < 5,5⁽¹⁾ | ¼ SMP para pH_água 6,0 | Superficial⁽⁵⁾ |
| 5.3-d | Plantio direto | Sistema consolidado, com restrições⁽³⁾ na camada de 10 a 20 cm | 10 a 20⁽⁴⁾⁽⁶⁾ | 6,0 | pH < 5,5 e Al ≥ 30% | 1 SMP para pH_água 6,0⁽⁷⁾ | Incorporado⁽²⁾⁽³⁾ |
| 5.3-e | Arroz irrigado | Semeadura em solo seco | 0 a 20 | 5,5 | pH < 5,5⁽¹⁾ | 1 SMP para pH_água 5,5 | Incorporado |
| 5.3-f | Arroz irrigado | Pré-germinado ou transplante de mudas | 0 a 20 | — | V ≤ 40%⁽⁸⁾ | NC=(40-V%)/100 *CTC_pH7,0 | Incorporado |

**Notas:**
- (1) "Não aplicar quando V ≥ 65% e saturação por Al na CTC <10%."
- (2) "Quando a disponibilidade de P e de K forem menores do que o teor crítico, recomenda-se fazer a adubação de correção com incorporação de fertilizantes aproveitando a mobilização do solo pela calagem."
- (3) "Considerar na decisão de incorporar o calcário a ocorrência de produtividade da culturas abaixo da média local, especialmente em anos de estiagem; compactação do solo restringindo crescimento radicular em profundidade; e disponibilidade de fósforo na camada de 10 a 20 cm abaixo do teor crítico."
- (4) "Amostrar separadamente as camadas de 0 a 10 e de 10 a 20 cm."
- (5) "Quantidade aplicada em superfície limitada a 5 t/ha (PRNT 100%)"
- (6) "Tomada de decisão independe da condição do solo da camada 0 a 10 cm."
- (7) "Usar valor de SMP médio das duas camadas (0 a 10 e 10 a 20 cm) para definir a dose de calcário a ser incorporado."
- (8) "Não aplicar se Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³"

### TAB-04 — Tabela 5.4 (p. 78)

**Título:** "Tabela 5.4. Critérios para indicação da necessidade e da quantidade de corretivo da acidez para o cultivo de forrageiras"

Observação de leiaute: a célula "6,0" é mesclada nas três linhas do meio, e a célula da cultura "Cultivos anuais…" é mesclada em duas linhas. Aqui estão repetidas.

| # | Cultura | Sistema de manejo | Amostragem do solo (cm) | pH de referência | Tomada de decisão | Quantidade de calcário | Modo de aplicação |
|---|---|---|---|---|---|---|---|
| 5.4-a | Alfafa | Qualquer um | 0 a 20 | 6,5 | pH < 6,0 | 1 SMP para pH_água 6,5 | Incorporado⁽²⁾ |
| 5.4-b | Espécies perenes | Implantação da forrageira⁽³⁾ | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado⁽²⁾ |
| 5.4-c | Cultivos anuais de gramíneas, leguminosas ou consórcios⁽⁴⁾ | Convencional ou implantação do plantio direto | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado⁽²⁾ |
| 5.4-d | Cultivos anuais de gramíneas, leguminosas ou consórcios⁽⁴⁾ | Plantio direto consolidado | 0 a 10 | 6,0 | pH < 5,5⁽¹⁾ | ¼ SMP para pH_água 6,0 | Superficial⁽⁵⁾ |
| 5.4-e | Campo natural | Qualquer um | 0 a 10 | — | V ≤ 40 %⁽⁶⁾⁽⁷⁾ | NC=(40-V%)/100 *CTC_pH7,0 | Superficial⁽⁵⁾ |

**Notas:**
- (1) "Não aplicar quando V ≥ 65% e saturação por Al na CTC <10%."
- (2) "Quando a disponibilidade de P e de K forem menores do que o teor crítico, fazer a adubação de correção incorporando fertilizantes após a calagem"
- (3) "Para reaplicação utilizar recomendação de plantio direto consolidado de gramínea ou leguminosa, conforme a cultura."
- (4) "Quando essas espécies forem cultivadas integradas à produção de grãos (integração lavoura-pecuária), a recomendação de calcário segue a recomendação para as culturas de grãos (Tabela 5.3)"
- (5) "Quantidade aplicada em superfície limitada a 5 t/ha (PRNT 100%)"
- (6) "Não aplicar se Ca trocável ≥ 4,0 e Mg trocável ≥1,0 cmol_c/dm³"
- (7) "Não adicionar calcário quando do uso de fosfatos naturais."

### TAB-05 — Tabela 5.5 (p. 81)

**Título:** "Tabela 5.5. Critérios para a indicação da necessidade e da quantidade de corretivo da acidez para cultivos de hortaliças, tubérculos e raízes."

Observação de leiaute: nesta tabela o cabeçalho da coluna de amostragem é apenas "Amostragem", sem "(cm)". A célula "6,0" e a célula "Demais culturas olerícolas" são mescladas em duas linhas.

| # | Cultura | Sistema de manejo | Amostragem | pH de referência | Tomada de decisão | Quantidade de calcário | Modo de aplicação |
|---|---|---|---|---|---|---|---|
| 5.5-a | Aspargo | Qualquer um | 0 a 20 | 6,5 | pH < 6,0 | 1 SMP para pH_água 6,5 | Incorporado⁽¹⁾ |
| 5.5-b | Demais culturas olerícolas | Cultivo convencional e implantação do plantio direto | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado⁽¹⁾ |
| 5.5-c | Demais culturas olerícolas | Plantio direto consolidado | 0 a 10 | 6,0 | pH < 5,5 | ¼ SMP para pH_água 6,0 | Superficial⁽²⁾ |
| 5.5-d | Palm. real, pupunheira, batata e batata doce | Qualquer um | 0 a 20 | 5,5 | pH < 5,5 e Al% >10 | 1 SMP para pH_água 5,5 | Incorporado⁽¹⁾ |
| 5.5-e | Mandioca | Qualquer um | 0 a 20 | — | V ≤ 40%⁽³⁾ | NC=(40-V%)/100 *CTC_pH7,0 | Incorporado⁽¹⁾ |

**Notas:**
- (1) "Quando a disponibilidade de P e de K forem menores do que o teor crítico, fazer a adubação de correção juntamente com a calagem."
- (2) "Quantidade aplicada em superfície limitada a 5 t/ha (PRNT 100%)"
- (3) "Não aplicar se Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³"

🔀 `INC-18`: a linha 5.5-c (PD consolidado) **não** traz a nota "Não aplicar quando V ≥ 65% e saturação por Al na CTC <10%", que aparece nas linhas equivalentes 5.3-c e 5.4-d.

### TAB-06 — Tabela 5.6 (p. 83)

**Título:** "Tabela 5.6. Critérios para a indicação da necessidade e da quantidade de corretivo da acidez para plantas frutíferas e espécies florestais."

| # | Cultura | Área a corrigir | Amostragem do solo (cm) | pH de referência | Tomada de decisão | Quantidade de calcário | Modo de aplicação |
|---|---|---|---|---|---|---|---|
| | **Frutíferas** | | | | | | |
| 5.6-a | Macieira e oliveira | Área total ou faixa de plantio⁽¹⁾ | 0 a 20 | 6,5 | pH < 6,0 | 1 SMP para pH_água 6,5 | Incorporado⁽⁴⁾⁽⁵⁾ |
| 5.6-b | Amoreira-preta, mirtilo, palm. juçara | Área total ou faixa de plantio⁽¹⁾ | 0 a 20 | 5,5 | pH < 5,5 Al% >10 | 1 SMP para pH_água 5,5 | Incorporado⁽⁴⁾ |
| 5.6-c | Demais frutíferas⁽³⁾ | Área total ou faixa de plantio⁽¹⁾ | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado⁽⁴⁾⁽⁵⁾ |
| | **Espécies florestais** | | | | | | |
| 5.6-d | Espécies florestais | Área total ou faixa de plantio⁽¹⁾ | 0 a 20 | — | V ≤ 40%⁽²⁾ | NC=(40-V%)/100 *CTC_pH7,0 | Incorporado⁽⁴⁾ |

Na linha 5.6-b, a célula de decisão traz "pH < 5,5" e "Al% >10" em duas linhas, sem conectivo escrito. O texto (p. 82) usa "e": "quando o valor do pH do solo for menor que 5,5 e a saturação por Al for maior que 10%".

**Notas:**
- (1) "A aplicação de calcário pode se restringir apenas a faixa de plantio, com o ajuste correspondente da dose em função da área de aplicação."
- (2) "Não aplicar se Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³."
- (3) "A reaplicação de calcário nas frutíferas de ciclo longo pode ocorrer durante a fase de produção, quando o pH for < 5,5 com dose equivalente a ½ do que o índice SMP indicar para pH 5,5 aplicado em superfície em área total (limitada a 5 t/ha com PRNT 100%)."
- (4) "Quando a disponibilidade de P e de K forem menores do que o teor crítico, fazer a adubação de correção juntamente com a calagem."
- (5) "Quando possível, incorporar o calcário até 30 cm de profundidade, ajustando a dose para 1,5 vezes a dose recomendada para a camada de 0 a 20 cm."

### TAB-07 — Tabela 5.7 (p. 86)

**Título:** "Tabela 5.7. Critérios para a indicação da necessidade e da quantidade de corretivo da acidez para plantas medicinais, aromáticas e condimentares, ornamentais e outras culturas comerciais."

Observação: esta tabela **não** tem coluna "Sistema de manejo" nem "Área a corrigir".

| # | Cultura | Amostragem do solo (cm) | pH de referência | Tomada de decisão | Quantidade de calcário | Modo de aplicação |
|---|---|---|---|---|---|---|
| | **Medicinais, aromáticas e condimentares** | | | | | |
| 5.7-a | Piretro | 0 a 20 | 6,5 | pH < 6,0 | 1 SMP para pH_água 6,5 | Incorporado |
| 5.7-b | Camomila, capim-limão, estévia, hortelã, gengibre, palma-rosa, urucum, vetiver | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado |
| 5.7-c | Alfavaca, calêndula, cardamomo, carqueja, coentro, cúrcuma, erva-doce, funcho, guaco | 0 a 20 | 5,5 | pH < 5,5 e Al%>10 | 1 SMP para pH_água 5,5 | Incorporado |
| 5.7-d | Citronela, chá | 0 a 20 | — | V ≤ 40%⁽¹⁾ | NC=(40-V%)/100 *CTC_pH7,0 | Incorporado |
| | **Ornamentais** | | | | | |
| 5.7-e | Roseira e crisântemo de corte | 0 a 20⁽²⁾ | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado |
| | **Outras culturas comerciais** | | | | | |
| 5.7-f | Cana-de-açucar e tabaco | 0 a 20 | 6,0 | pH < 5,5 | 1 SMP para pH_água 6,0 | Incorporado |

**Notas:**
- (1) "Não aplicar se Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³"
- (2) "Para a roseira de corte, quando possível, incorporar o calcário até 30 cm de profundidade, ajustando a dose para 1,5 vezes a dose recomendada para a camada de 0 a 20 cm."

(Grafia "Cana-de-açucar", sem acento no "u", mantida como no original da Tabela 5.7.)

---

## 5. Regras por sistema de manejo e por grupo de culturas

### 5.1 Regras gerais (valem para todo o capítulo)

- **RN-01 (p. 67).** "A tomada de decisão é baseada na sensibilidade da cultura, no grau de acidez do solo ou, em alguns casos, também no sistema de produção."
- **RN-03 (p. 67).** "Quando o valor de pH é maior que o valor de referência não há resposta econômica à calagem." (→ `TRV-01`)
- **RN-04 (p. 67).** "Para algumas culturas não responsivas à elevação do pH, a saturação por bases é o critério adotado para o fornecimento de Ca e de Mg às plantas."
- **RN-06 (p. 69).** "Sempre que o valor do pH do solo for limitante à produtividade da cultura deve-se aplicar calcário em quantidade suficiente para elevar o seu valor ao valor do pH de referência da(s) cultura(s) visada(s). Contudo, a tomada de decisão em relação a necessidade de calagem pode estar associada a um valor de pH menor que o valor de referência da cultura." A razão dada é que a resposta econômica "depende da presença de Al em forma trocável no solo, o que somente ocorre quando o valor do pH em água é menor que 5,5". Exemplo do próprio manual: para culturas com pH de referência 6,0, "a acidez vai limitar pouco a produtividade durante o período em que o pH diminuir de 6,0 até 5,5, pois somente abaixo desse valor é que reaparecerá o Al trocável."
- **RN-07 (p. 69) — incorporação profunda.** "Para a primeira calagem (correção da acidez natural) ou no estabelecimento de um novo sistema produtivo de longa duração (sistema plantio direto, pastagem perene, fruticultura, florestas), o calcário deve ser incorporado, sempre que possível, o mais profundo (≥ 20 cm). Esta recomendação também é usada nas reaplicações de calcário, em áreas com mobilização do solo para a semeadura dos cultivos anuais."
- **RN-08 (p. 69) — reaplicação superficial no PD.** A reaplicação na superfície no PD, "considerando que o solo já teve sua acidez potencial corrigida em profundidade no estabelecimento do sistema, também não precisa ser feita imediatamente após a constatação de que o valor do pH do solo for inferior ao do pH de referência. Mesmo valores de pH menores do que 5,5 podem não se constituir em problema porque algumas culturas toleram baixas saturações por Al. Neste caso, a acidez pode ser interpretada agregando o valor da saturação por Al e da saturação por bases, como critérios auxiliares de tomada de decisão da aplicação de calcário. Entretanto, a dose de calcário deve ser ajustada por se considerar uma menor massa de solo em contato com o corretivo."
- **RN-09 (p. 69).** "…a reaplicação de calcário se dará sempre que o resultado analítico do solo amostrado indicar necessidade, aliado a fatores como o tipo de planta e o sistema de manejo adotado." Os critérios específicos "são apresentados nos itens 5.2.2 a 5.2.8".
- **RN-10 (p. 67).** Como a reacidificação ocorre a partir da superfície, o Al "pode ser facilmente neutralizado pela adição de calcário em superfície, sem a necessidade de revolvimento (calagem superficial). Dessa forma, a dose de calcário aplicada na superfície sem revolvimento deve ser menor, ajustada para a correção de uma menor massa de solo em contato com o corretivo da acidez."
- **RN-05 (p. 67)** — rotação: usar o pH de referência da cultura mais sensível (ver TAB-01).

### 5.2 Culturas produtoras de grãos (item 5.2.2, p. 72–75; Tabela 5.3)

- **RN-22 (p. 72).** "Exceto para o arroz irrigado, as demais culturas de grãos tem como pH de referência o valor de pH 6,0."
- **RN-23 (p. 72).** "…os maiores efeitos da acidez que limitam a produção vegetal aparecem quando o valor do pH do solo é menor que 5,5, quando então é recomendada a aplicação de calcário."
- **RN-24 (p. 72).** "…a camada amostrada e a dose de calcário são dependentes do sistema de manejo e da condição da área, determinando assim o modo de aplicação (Tabela 5.3)."

#### 5.2.a Sistema convencional (Tab. 5.3-a)
- **RN-25 (p. 72–73).** Amostragem 0 a 20 cm. Decisão: pH < 5,5. Dose: 1 SMP para pH 6,0. Incorporado. Texto: "O corretivo deve ser incorporado na camada de 0 a 20 cm e realizada, preferencialmente, antes da implantação de cultivos de inverno."
- **RN-28 (p. 73; Tab. 5.3 nota 2).** "Também pode se aproveitar a mobilização do solo para se fazer a adubação de correção, em especial, a de P, caso necessário." Nota (2): adubação de correção de P e K quando abaixo do teor crítico, "aproveitando a mobilização do solo pela calagem".
- **RN-27 (p. 73).** "Devido à exposição do solo pela incorporação do calcário, deve se ter a preocupação de implantar uma cultura com rápido crescimento inicial e de grande potencial de produção de matéria seca, bem como a efetivação das práticas mecânicas de contenção da erosão e o planejamento das estradas."

#### 5.2.b Plantio direto — implantação do sistema (Tab. 5.3-b)
- **RN-26 (p. 72).** Idêntico ao convencional: amostragem 0 a 20 cm; pH < 5,5; 1 SMP para pH 6,0; incorporado na camada de 0 a 20 cm. RN-27 e RN-28 também se aplicam.
- **RN-29 (p. 73) — advertência.** "A decisão de iniciar o sistema plantio direto com aplicação superficial de calcário, especialmente em áreas de campo natural com acidez potencial elevada, pode comprometer a eficiência da reaplicação de calcário em superfície no sistema plantio direto já consolidado."
- **CE-01 (p. 73) — campo natural de baixa acidez potencial.** "Em solos de campo natural de baixa acidez potencial (índice SMP >5,5) e com a opção de se iniciar o sistema plantio direto com a aplicação superficial de calcário, em que pese a dificuldade de se corrigir a camada de 10 a 20 cm com essa prática, a dose sugerida corresponde a ½ (metade) do que o índice SMP indicar para pH 6,0." Esta regra **não** consta na Tabela 5.3.
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-20`: para este caso, o manual não indica a camada de amostragem, o critério de decisão (pH < 5,5?) nem se vale o limite de 5 t/ha. "Acidez potencial elevada" não tem limiar numérico além do complemento implícito (SMP ≤ 5,5).

#### 5.2.c Plantio direto consolidado, sem restrições na camada de 10 a 20 cm (Tab. 5.3-c)
- **RN-30 (p. 73).** "No sistema plantio direto consolidado a amostragem recomendada é de 0 a 10 cm, com monitoramento frequente da camada de 10 a 20 cm (ver Capítulo 3)." Nota (4) da Tab. 5.3: "Amostrar separadamente as camadas de 0 a 10 e de 10 a 20 cm."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-21`: a frequência do "monitoramento frequente" não está nestas páginas (remete ao Capítulo 3, não anexado).
- **RN-31 (p. 73).** "Quando não há restrições químicas e físicas para o crescimento radicular na camada de 10 a 20 cm, considera-se o valor de pH <5,5, da camada 0 a 10 cm, para a decisão de aplicação de calcário."
- **RN-32 (p. 73; nota 1)** — trava por V% e saturação por Al (→ `TRV-02`).
- **RN-33 (p. 73).** "A dose sugerida para a aplicação superficial de calcário, neste sistema, corresponde a ¼ (uma quarta parte) do que o índice SMP indicar para elevar o pH do solo até 6,0 (Tabela 5.2)." Modo: Superficial. Limite: 5 t/ha (PRNT 100%) (nota 5).
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-19`: o texto não diz de qual camada vem o SMP usado no ¼. A leitura pela coluna "Amostragem" (0 a 10) sugere a camada de 0 a 10 cm, mas a Tabela 5.2 é descrita para a camada de 0 a 20 cm.
- **RN-34 (p. 73).** "Essa sugestão considera que houve a correção da acidez da camada mais profunda que 10 cm, quando do estabelecimento do sistema plantio direto e se baseia que a reacidificação de solos manejados sem revolvimento ocorre a partir da superfície. A quantidade de calcário que corresponde a ¼ … é suficiente para neutralizar a acidez que se forma na camada de 0 a 5 cm. Com o passar do tempo, os efeitos da aplicação superficial de calcário poderão atingir camadas mais profundas, dependendo das características do solo e de seu manejo, bem como da dose aplicada e das condições climáticas após a aplicação."
- **RN-35 (p. 73–74) — escarificação/subsolagem.** "Quando no sistema plantio direto houver escarificações ou mesmo subsolagem para romper camadas compactadas, a incorporação de calcário por essas operações será localizada e, em geral, não corrige todo o volume de solo existente na profundidade de ação do escarificador ou do subsolador. Em solos com acidez na camada de 10 a 20 cm, a escarificação e subsolagem ainda podem resultar no aumento da acidez da camada mais superficial, devido à inversão das camadas, o que ocorrem em forma de manchas na área revolvida por estas operações."

#### 5.2.d Plantio direto consolidado, com restrições na camada de 10 a 20 cm — reinício do PD (Tab. 5.3-d)
- **RN-36 (p. 74) — condições.** "Especial atenção deve ser dada em áreas de plantio direto que não foram implantadas com a correção da acidez na camada de 0 a 20 cm e que a saturação por Al for ≥30%, na camada de 10 a 20 cm. Deve-se considerar também a ocorrência de produtividade das culturas abaixo da média local, especialmente em anos de estiagem; o grau de compactação do solo restringindo crescimento radicular em profundidade; e se a disponibilidade de P do solo na camada de 10 a 20 cm for menor que o teor crítico. Nesses casos pode ser necessário **reiniciar o sistema plantio direto**…"
  - Tabela: amostragem 10 a 20 cm (notas 4 e 6); decisão "pH < 5,5 e Al ≥ 30%"; nota (6): "Tomada de decisão independe da condição do solo da camada 0 a 10 cm."; nota (3): fatores a considerar (produtividade, compactação, P 10–20 cm).
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-16`/`LAC-59`: não diz se "pH < 5,5 e Al ≥ 30%" basta, ou se é preciso também um ou todos os fatores da nota (3) (lógica E/OU). O texto usa "pode ser necessário" e atribui a decisão à avaliação de engenheiros agrônomos (RN-39), sem regra determinística. A condição "áreas … que não foram implantadas com a correção da acidez na camada de 0 a 20 cm" está no texto, mas não na tabela.
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-17`: na tabela está escrito apenas "Al ≥ 30%". O texto diz "saturação por Al". 🔀 `INC-16`.
- **RN-37 (p. 74; nota 7).** "…o calcário deve ser incorporado ao solo, por aração e gradagem, sendo utilizada a dose para pH 6,0, determinada pela média dos valores do índice SMP das amostras das camadas de 0 a 10 e de 10 a 20 cm." Nota (7): "Usar valor de SMP médio das duas camadas…".
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-18`: "média" sem especificar se simples ou ponderada. O SMP médio pode cair fora do passo de 0,1 da Tabela 5.2 (→ `LAC-01`).
- **RN-38 (p. 74).** "Caso haja necessidade de correção do teor de P dessa última camada, recomenda-se a fosfatagem, por ocasião do revolvimento. Nesse caso, a dose deste nutriente também deve ser estabelecida considerando a média dos valores de P das amostras coletadas nas camadas de 0 a 10 e de 10 a 20 cm, usando as indicações do Capítulo 6."
- **RN-39 (p. 74).** "A decisão de reiniciar o sistema plantio direto também deve levar em consideração aspectos relacionados à adequada conservação do solo e da água e, portanto, a avaliação do cenário geral, por engenheiros agrônomos, é fundamental."
- **RN-40 (Tab. 5.3 notas 2 e 3).** Modo "Incorporado⁽²⁾⁽³⁾": adubação de correção de P e K aproveitando a mobilização; considerar os fatores da nota (3) na decisão de incorporar.

#### 5.2.e Arroz irrigado (p. 74; Tab. 5.3-e e 5.3-f)
- **RN-41 (p. 74).** "Para a cultura do arroz irrigado por inundação, a recomendação de calcário depende das reações de oxidação/redução que ocorrem ao longo do ciclo da cultura."
- **RN-42 (p. 74) — pré-germinado ou transplante de mudas.** Quando "o alagamento ocorre durante praticamente todo o ciclo do arroz (sistema pré-germinado ou transplante de mudas) não há necessidade de aplicar calcário como corretivo da acidez do solo, pois ocorre a elevação natural do pH para em torno de 6,0, à exceção de alguns solos orgânicos. No entanto, quando a saturação por bases for menor do que 40% (exceto se Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³), recomenda-se a aplicação de calcário dolomítico como fonte desses nutrientes, na quantidade estimada pela saturação por bases para atingir 40%."
  - Tabela 5.3-f: amostragem 0 a 20; pH ref "—"; decisão "V ≤ 40%⁽⁸⁾"; NC=(40-V%)/100 *CTC_pH7,0; Incorporado.
  - 🔀 `INC-04` (< vs ≤).
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-61`: "à exceção de alguns solos orgânicos" — o texto não identifica quais solos orgânicos são exceção nem que regra se aplica a eles.
- **RN-43 (p. 74) — semeadura em solo seco.** "No caso de sistemas em que a irrigação inicia entre 20 e 30 dias após a emergência das plantas (sistemas de semeadura em solo seco) utiliza-se o critério de tomada de decisão baseado nos resultados de análise do solo da camada 0 a 20 cm (pH em água menor que 5,5), sendo a dose determinada pelo índice SMP para elevar o pH do solo até 5,5 (Tabela 5.3)."
  - Tabela 5.3-e: modo Incorporado; decisão com nota (1) (trava V ≥ 65% e saturação por Al < 10%).
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-28`: o texto do item não menciona a trava da nota (1) para o arroz em solo seco. A tabela a aplica, e a camada seria a de 0 a 20 cm (a única amostrada nesta linha), mas isso não está dito.
- **RN-44 (p. 74) — rotação.** "Em áreas de rotação com culturas de sequeiro, incluindo as pastagens cultivadas, deve-se fazer a correção da acidez conforme a cultura mais sensível à acidez."

### 5.3 Espécies forrageiras (item 5.2.3, p. 76–78; Tabela 5.4)

- **RN-45 (p. 76).** Três grupos: "pH 6,5 (alfafa), pH 6,0 (espécies perenes e cultivos anuais de gramíneas ou leguminosas isoladas ou em consórcio) e aquelas que dispensam correção da acidez (campo natural)."
- **RN-46 (p. 76) — alfafa (5.4-a).** "…o calcário deve ser aplicado quando o valor do pH da amostra de 0 a 20 cm for menor do que 6,0. Já a dose corresponderá a quantidade necessária para elevar o valor do pH até 6,5. O calcário deve ser incorporado na camada de 0 a 20 cm. Na renovação da forrageira, se a nova análise de solo indicar necessidade de aplicação de calcário, este deve também ser incorporado e na camada de 0 a 20 cm." Sistema de manejo: "Qualquer um".
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-32`: não há regra para reaplicação durante a vida útil do alfafal (entre implantação e renovação), nem opção superficial.
- **RN-47 (p. 76) — espécies perenes (5.4-b).** "Na implantação de pastagem perene, independentemente da espécie, a calagem deve ser feita quando o pH da camada de 0 a 20 cm for menor do que 5,5. A dose de calcário corresponderá a quantidade necessária para elevar o valor do pH do solo a 6,0 e o corretivo deverá ser incorporado no solo. Nos anos subsequentes, seguem-se os critérios de amostragem e de tomada de decisão do sistema plantio direto consolidado de gramíneas ou leguminosas anuais (Tabela 5.4)." Nota (3): "Para reaplicação utilizar recomendação de plantio direto consolidado de gramínea ou leguminosa, conforme a cultura."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-29`: o texto cita apenas "critérios de amostragem e de tomada de decisão" do PD consolidado. A nota (3) fala em "recomendação" (o que incluiria a dose ¼). 🔀 `INC-13`.
- **RN-48 (p. 76) — anuais, convencional ou implantação do PD (5.4-c).** "…o calcário deve ser incorporado na camada de 0 a 20 cm e a quantidade aplicada deve ser a necessária para elevar o valor do pH do solo a 6,0." Decisão (tabela): pH < 5,5, amostragem 0 a 20.
- **RN-49 (p. 76–77) — anuais, PD consolidado (5.4-d).** "…a aplicação de calcário é superficial e a dose corresponderá a ¼ (uma quarta parte) do que o índice SMP indicar para elevar o valor do pH do solo até 6,0." Tabela: amostragem 0 a 10; decisão pH < 5,5⁽¹⁾ (trava `TRV-02`); limite 5 t/ha⁽⁵⁾. O texto repete a premissa e a neutralização da camada de 0 a 5 cm (igual a RN-34).
- **RN-50 (p. 77; nota 4) — integração lavoura-pecuária.** "A produção de espécies forrageiras integradas à produção de grãos deve seguir a recomendação de calagem do sistema de produção de grãos, conforme indicado na tabela 5.3."
- **RN-51 (p. 77) — campo natural (5.4-e).** "No caso de pastagens em campos naturais, a aplicação do calcário deve ser feita quando a saturação por bases for menor do que 40% (exceto se Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³), com a aplicação de calcário dolomítico na quantidade estimada pela saturação por bases para atingir 40%, aplicada em superfície e sem revolvimento."
  - Tabela: sistema "Qualquer um"; amostragem 0 a 10; decisão "V ≤ 40 %⁽⁶⁾⁽⁷⁾"; modo Superficial⁽⁵⁾ (limite 5 t/ha).
  - Trava de fosfatos naturais → `TRV-04`.
  - 🔀 `INC-04`, `INC-09`, `INC-15`. ⚠️ `LAC-30`.
- **RN-52 (Tab. 5.4 nota 2).** P e K abaixo do teor crítico: "fazer a adubação de correção incorporando fertilizantes após a calagem". 🔀 `INC-08`.

### 5.4 Hortaliças, tubérculos e raízes (item 5.2.4, p. 79–81; Tabela 5.5)

- **RN-53 (p. 79).** "…há quatro grupos de plantas: pH 6,5 (aspargo), pH 6,0 (maioria das olerícolas), pH 5,5 (palmeira-real, pupunheira, batata e batata doce) e calagem para repor Ca e Mg (mandioca)."
- **RN-54 (p. 79) — aspargo (5.5-a).** "…a camada de solo amostrada é de 0 a 20 cm, o critério de decisão para a aplicação de calcário é quando o pH do solo for menor que 6,0 e a dose para elevar o pH do solo até 6,5. O calcário deve ser incorporado na camada de 0 a 20 cm. Deve-se fazer nova análise do solo quando da reimplantação da cultura, sendo que a nova recomendação de calcário segue o mesmo critério e o calcário deve também ser incorporado na camada de 0 a 20 cm."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-33`: não há regra de reaplicação entre a implantação e a reimplantação.
- **RN-55 (p. 79) — demais olerícolas, convencional (5.5-b).** "As demais culturas olerícolas, exceto aspargo, cultivadas no sistema convencional, deverão receber calcário toda vez que o pH do solo for menor do que 5,5 em dose para elevar o pH do solo a 6,0 definida pelo índice SMP, incorporado na camada de 0 a 20 cm."
- **RN-56 (p. 79) — demais olerícolas, implantação do PD (5.5-b).** "Para a produção de hortaliças no sistema plantio direto, no início do sistema o calcário deve ser incorporado na dose suficiente para elevar o pH do solo a 6,0."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-34`: o texto não traz critério de decisão para o início do PD em hortaliças. A tabela traz pH < 5,5 e amostragem 0 a 20.
- **RN-57 (p. 79) — demais olerícolas, PD consolidado (5.5-c).** "Nos anos subsequentes, caso constatada a necessidade de reaplicação de calcário (pH do solo da camada 0 a 10 cm menor do que 5,5), a recomendação é ¼ da dose indicada para elevar o pH 6,0 pelo indice SMP, sem incorporação (Tabela 5.5)." A premissa é a correção em profundidade no estabelecimento e a reacidificação a partir da superfície: "a quantidade aplicada será suficiente para neutralizar a acidez da camada de 0 a 5 cm graças a migração de partículas finas de calcário ou de seus produtos de dissociação no perfil." Limite 5 t/ha (nota 2).
  - 🔀 `INC-18` / ⚠️ `LAC-35`: sem a trava V ≥ 65% e saturação por Al < 10% nesta linha.
- **RN-58 (p. 79–80) — batata e batata-doce (5.5-d).** "O cultivo de batata e batata doce deve ser feito em solo com pH até 5,5 pela depreciação que pode ocorrer na qualidade dos tubérculos de batata em pH mais elevado. Por isso, a aplicação de calcário é indicada quando o pH for menor que 5,5 e saturação por Al maior que 10%, sendo a dose de calcário para corrigir até pH 5,5 na camada de 0 a 20 cm incorporado ao solo antes da implantação da batata."
- **RN-59 (p. 80) — batata em rotação.** "Quando a batata for cultivada em rotação com outras culturas cujo pH de referencia for 6,0 (grãos ou pastagens), manter o valor de referência do pH limitado a 5,5; caso contrário, poderão ocorrer problemas na qualidade dos tubérculos." (→ `TRV-07`, `CE-10`; 🔀 `INC-20`; ⚠️ `LAC-37`)
- **RN-60 (Tab. 5.5-d) — palmeira-real e pupunheira.** Mesma linha da batata: sistema "Qualquer um"; 0 a 20; pH ref 5,5; pH < 5,5 e Al% > 10; 1 SMP para pH 5,5; Incorporado. O texto do item só as cita na lista de grupos (RN-53).
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-36`: para o grupo pH 5,5 ("Qualquer um"), não há regra específica de PD consolidado (fração de dose, aplicação superficial).
- **RN-61 (p. 80) — mandioca (5.5-e).** "A cultura da mandioca não responde à correção da acidez do solo, mas é usual seu cultivo em solos onde pode ocorrer insuficiente disponibilidade de Ca e Mg trocáveis. Por este motivo, sempre que saturação por bases for menor do que 40% (exceto se Ca trocável ≥ 4,0 e Mg trocável ≥ 1,0 cmol_c/dm³), recomenda-se a aplicação de calcário dolomítico como fonte desses nutrientes, na quantidade estimada pela saturação por bases para atingir 40%, incorporando anteriormente ao plantio." 🔀 `INC-04`.
- **RN-62 (Tab. 5.5 nota 1).** P e K abaixo do teor crítico: "fazer a adubação de correção juntamente com a calagem."

### 5.5 Frutíferas e espécies florestais (item 5.2.5, p. 82–84; Tabela 5.6)

- **RN-63 (p. 82).** Quatro grupos: "pH 6,5 (macieira e oliveira); pH 6,0 (maioria das espécies frutíferas), pH 5,5 (amora-preta, mirtilo e palmeira-juçara) e aquelas sem pH de referência, mas com indicação de calagem para a reposição de Ca e de Mg (espécies florestais)."
- **RN-64 (p. 82) — macieira e oliveira (5.6-a).** "…a calagem deve ser realizada quando o pH do solo for menor que 6,0. Contudo, a dose de calcário é baseada na quantidade obtida com o índice SMP do solo para atingir o valor de pH 6,5. O calcário deve ser incorporado, preferencialmente, até 30 cm de profundidade (aumentando em 50% (1,5 vezes) a dose recomendada para a camada de 0 a 20 cm) (Tabela 5.6)." Tabela, nota (5): "Quando possível…".
- **RN-65 (p. 82) — amora-preta e mirtilo (5.6-b; a tabela inclui palm. juçara).** "…a calagem deve ser realizada quando o valor do pH do solo for menor que 5,5 e a saturação por Al for maior que 10%. A dose de calcário é baseada na quantidade desse corretivo obtida com o índice SMP para atingir pH 5,5. O calcário deve ser incorporado na camada de 0 a 20 cm." 🔀 `INC-12`.
- **RN-66 (p. 82) — demais frutíferas, pH ref 6,0 (5.6-c).** "…a calagem deve ser realizada quando o pH do solo for menor que 5,5. A dose de calcário corresponde a quantidade obtida no índice SMP para atingir pH 6,0. O calcário deve ser incorporado preferencialmente até 30 cm de profundidade (aumentando em 50% (1,5 vezes) a dose recomendada para a camada de 0 a 20 cm)."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-38`: "preferencialmente" / "quando possível" não têm critério objetivo para decidir entre 20 e 30 cm.
- **RN-67 (Tab. 5.6 nota 3) — reaplicação em frutíferas de ciclo longo.** "A reaplicação de calcário nas frutíferas de ciclo longo pode ocorrer durante a fase de produção, quando o pH for < 5,5 com dose equivalente a ½ do que o índice SMP indicar para pH 5,5 aplicado em superfície em área total (limitada a 5 t/ha com PRNT 100%)." A nota está ancorada apenas em "Demais frutíferas".
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-40`: não há regra de reaplicação para macieira/oliveira nem para amoreira-preta/mirtilo/palmeira-juçara. "Ciclo longo" não é definido. A camada de amostragem para a reaplicação não é informada. 🔀 `INC-11` (alvo pH 5,5 na reaplicação de um grupo com referência 6,0).
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-41`: o item de frutíferas não trata de sistema de manejo (PD ou convencional).
- **RN-68 (p. 82) — espécies florestais (5.6-d).** "As espécies florestais são tolerantes ao Al trocável do solo e, consequentemente, têm menores respostas à correção da acidez do solo, que as culturas anuais. Em geral, as respostas a calagem são atribuídas, principalmente, ao adequado suprimento de Ca e de Mg às plantas. Assim, considera-se que estas espécies não respondem à correção da acidez do solo, mas poderá haver necessidade de aplicação de calcário quando a saturação por bases for menor do que 40% (exceto se Ca ≥ 4,0 e Mg ≥ 1,0 cmol_c/dm³) (Tabela 5.6). Nesse caso, aplica-se calcário dolomítico, como fonte desses nutrientes, em quantidade estimada pela saturação por bases para atingir 40% e incorporando o calcário no momento do plantio." 🔀 `INC-04`.
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-43`: o item não lista quais espécies são "florestais". A Tabela 5.1 lista, no grupo sem pH, araucária, acácia negra, bracatinga, cedro australiano, erva-mate, eucalipto e pinus, mas a ligação com a linha "Espécies florestais" da Tabela 5.6 não é escrita (o eucalipto é citado no contexto florestal na p. 84; a erva-mate, não).
- **RN-69, RN-70 (p. 84)** — área total vs. faixa; eucalipto (ver MET-07).
- **RN-71 (p. 84).** "Quando há colheita de madeira nas espécies florestais, estima-se que boa parte do Ca é exportada com a casca das árvores e, por isso, caso a espécie e o método de colheita permita, recomenda-se optar por deixar as cascas na gleba para aumentar a ciclagem deste nutriente."
- **RN-72 (p. 84).** "Em qualquer época durante o ciclo das culturas florestais, se for realizada análise de solo e for verificado que os teores de Ca e/ou Mg estão baixos, pode ser realizada a calagem, aplicando o calcário superficialmente, seguindo os critérios da Tabela 5.6."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-42`: "teores de Ca e/ou Mg estão baixos" não tem limiar. A Tabela 5.6 usa V ≤ 40% com exceção quando Ca ≥ 4,0 **e** Mg ≥ 1,0 (a conjunção "e/ou" do texto difere). O limite de 5 t/ha não é mencionado para esta aplicação superficial. 🔀 `INC-10`.
- **RN-73 (Tab. 5.6 nota 4).** P e K abaixo do teor crítico: adubação de correção "juntamente com a calagem".

### 5.6 Plantas medicinais, aromáticas e condimentares (item 5.2.6, p. 84–86; Tabela 5.7)

- **RN-74 (p. 84).** "A aplicação de calcário segue a lógica da existência de um valor de pH de referência para cada grupo das plantas bioativas. Solos com pH que extrapolam esses níveis recomendados podem levar a redução da produtividade, afetar a qualidade e a quantidade dos princípios ativos, podendo até mesmo comprometer os cultivos, ocasionando a morte das plantas."
- **RN-75 (p. 84–85).** "…plantas como a citronela (Cymbopogon winterianus) e o chá (Camellia sinensis) apresentaram comportamento indiferente à elevação do pH, sendo a calagem usada para suprimento de Ca e Mg. As indicações por cultura são apresentadas na Tabela 5.7." 🔀 `INC-03`.
- **Linhas da Tab. 5.7 (todas com amostragem 0 a 20 e modo Incorporado):**
  - **RN-80** Piretro: ref 6,5; pH < 6,0; 1 SMP para pH 6,5.
  - **RN-81** Camomila, capim-limão, estévia, hortelã, gengibre, palma-rosa, urucum, vetiver: ref 6,0; pH < 5,5; 1 SMP para pH 6,0.
  - **RN-82** Alfavaca, calêndula, cardamomo, carqueja, coentro, cúrcuma, erva-doce, funcho, guaco: ref 5,5; pH < 5,5 e Al% > 10; 1 SMP para pH 5,5.
  - **RN-83** Citronela, chá: ref "—"; V ≤ 40%⁽¹⁾; NC=(40-V%)/100 *CTC_pH7,0.
- **RN-76 (p. 85) — PD, implantação.** "Quando do uso de sistema de plantio direto desses cultivos, é importante na implantação do sistema, a incorporação do corretivo na camada de 0 a 20 cm."
- **RN-77 (p. 85) — PD consolidado.** "Com a consolidação do sistema, a aplicação do calcário deve ser realizada na superfície sem a incorporação quando o pH for menor do 5,5, utilizando-se de ¼ da dose indicada para elevar o pH do solo a 6,0, semelhantemente a todas as demais culturas conduzidas no sistema plantio direto."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-46`: a regra não aparece na Tabela 5.7. O texto não diz a camada de amostragem (0–10?), não cita o limite de 5 t/ha nem a trava V ≥ 65%/Al < 10%, e não diz se o alvo "6,0" vale também para os grupos 6,5 (piretro) e 5,5 (alfavaca etc.). 🔀 `INC-17`.
- **RN-78 (p. 85) — covas.** "No caso do plantio em covas, comumente adotado em solos pedregosos e em áreas muito declivosas, o calcário deve ser aplicado em toda a área e incorporado na cova, por ocasião do seu preparo." ⚠️ `LAC-47`.
- **RN-79 (p. 85) — solos degradados.** "No caso de solos degradados ou que nunca foram corrigidos, é importante fazer a incorporação em toda a área, sempre que possível."
- ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-45`: **manjericão** e **salsa** (Tabela 5.1, pH 5,5) não aparecem em nenhuma linha da Tabela 5.7 nem em outra tabela de critérios.

### 5.7 Espécies ornamentais (item 5.2.7, p. 85; Tabela 5.7-e)

- **RN-84 (p. 85) — roseira de corte.** "…a calagem deve ser realizada quando o pH do solo for menor do que 5,5; e em dose suficiente para elevar o pH do solo a 6,0 (Tabela 5.7) e, se possível, incorporar o calcário até 30 cm de profundidade, aumentando em 50% (1,5 vezes) a dose recomendada para a camada de 0 a 20 cm." (Tab. 5.7 nota 2.)
- **RN-85 (p. 85) — crisântemo de corte.** "Isso também se aplica para o crisântemo de corte, embora a incorporação do calcário deve ser na camada de 0 a 20 cm." (Não há o fator 1,5× para o crisântemo.)
- **RN-86 (p. 85).** "Para acelerar o processo de neutralização da acidez, pode-se usar calcário extrafino." ⚠️ `LAC-50`: "extrafino" não é especificado.
- **RN-87 (p. 85) — vasos.** "Quando cultivado em vasos, o substrato deve ser corrigido seguindo as mesmas recomendações feitas para o cultivo em solo, ajustando a quantidade de calcário à massa do substrato do vaso." ⚠️ `LAC-48`.
- **RN-88 (p. 85).** "Em todas as situações, é preferível utilizar o calcário dolomítico, visando o fornecer Ca e Mg."

### 5.8 Outras culturas comerciais (item 5.2.8, p. 85; Tabela 5.7-f)

- **RN-89 (p. 85) — cana-de-açúcar e tabaco.** "O valor de pH de referência das culturas da cana-de-açúcar e do tabaco é 6,0. Contudo, a calagem para estas culturas deve ser realizada quando o valor do pH do solo for menor do que 5,5. Já a dose de calcário deve ser a necessária para elevar o valor do pH do solo a 6,0 (Tabela 5.7), incorporando o calcário na camada de 0 a 20 cm."

### 5.9 Frequência de reaplicação (item 5.3, p. 87)

- **RN-90 (p. 87).** "A reaplicação de calcário em solos cultivados com culturas de grãos, forrageiras, olerícolas, tubérculos, raízes, plantas ornamentais, aromáticas, condimentares e medicinais e outras culturas comerciais será necessária quando o resultado de nova análise do solo reamostrado indicar a necessidade, considerando os referenciais que constam nos itens 5.2.3 a 5.2.8 e nas tabelas 5.3 a 5.7. A frequência com que isso ocorre varia com a dose e o residual do calcário aplicado anteriormente, bem como com o tipo de solo, de planta cultivada e do sistema de manejo empregado."
  - ⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-51`: não há intervalo fixo de reanálise ou de reaplicação. 🔀 `INC-06` (referência a itens), 🔀 `INC-07` (lista omite frutíferas e florestais).

### 5.10 Matriz-resumo sistema de manejo × dose × modo (somente o que está escrito)

| Situação | Amostragem (cm) | Decisão | Dose | Modo / profundidade | Limite | Fonte |
|---|---|---|---|---|---|---|
| Convencional (grãos) | 0–20 | pH < 5,5 | 1 SMP pH 6,0 | Incorporado 0–20 | — | Tab. 5.3-a; p. 72 |
| PD implantação (grãos) | 0–20 | pH < 5,5 | 1 SMP pH 6,0 | Incorporado 0–20 | — | Tab. 5.3-b; p. 72 |
| PD implantação em campo natural com SMP > 5,5, opção superficial | ⚠️ | ⚠️ | ½ SMP pH 6,0 | Superficial | ⚠️ | p. 73 |
| PD consolidado sem restrições (grãos) | 0–10 (+10–20 separado) | pH < 5,5 (0–10), trava V/Al | ¼ SMP pH 6,0 | Superficial | 5 t/ha | Tab. 5.3-c; p. 73 |
| PD consolidado com restrições (reinício) | 10–20 (+0–10 separado) | pH < 5,5 e Al ≥ 30% (10–20) | 1 SMP pH 6,0 com SMP médio 0–10/10–20 | Incorporado (aração e gradagem) | — | Tab. 5.3-d; p. 74 |
| Forrageiras anuais convencional/implantação PD | 0–20 | pH < 5,5 | 1 SMP pH 6,0 | Incorporado 0–20 | — | Tab. 5.4-c |
| Forrageiras anuais PD consolidado | 0–10 | pH < 5,5, trava V/Al | ¼ SMP pH 6,0 | Superficial | 5 t/ha | Tab. 5.4-d |
| Forrageiras perenes, implantação | 0–20 | pH < 5,5 | 1 SMP pH 6,0 | Incorporado | — | Tab. 5.4-b |
| Forrageiras perenes, anos seguintes | = PD consolidado anuais | = PD consolidado anuais | (ver `LAC-29`) | — | — | p. 76; nota 3 |
| Olerícolas convencional/implantação PD | 0–20 | pH < 5,5 | 1 SMP pH 6,0 | Incorporado 0–20 | — | Tab. 5.5-b |
| Olerícolas PD consolidado | 0–10 | pH < 5,5 | ¼ SMP pH 6,0 | Superficial | 5 t/ha | Tab. 5.5-c |
| Medicinais PD implantação | ⚠️ | ⚠️ | ⚠️ | Incorporado 0–20 | — | p. 85 |
| Medicinais PD consolidado | ⚠️ | pH < 5,5 | ¼ da dose para pH 6,0 | Superficial | ⚠️ | p. 85 |
| Frutíferas ciclo longo ("demais"), reaplicação na produção | ⚠️ | pH < 5,5 | ½ SMP pH 5,5 | Superficial, área total | 5 t/ha | Tab. 5.6 nota 3 |
| Florestais, qualquer época | 0–20 (tab.) | "Ca e/ou Mg baixos" / critérios Tab. 5.6 | V → 40% | Superficial | ⚠️ | p. 84 |
| Campo natural | 0–10 | V ≤ 40% (exceção Ca/Mg; fosfatos naturais) | V → 40% | Superficial, sem revolvimento | 5 t/ha | Tab. 5.4-e; p. 77 |
| Primeira calagem / novo sistema de longa duração | — | — | — | Incorporado "o mais profundo (≥ 20 cm)", sempre que possível | — | p. 69 |
| Frutíferas 6,5 e 6,0; roseira de corte | 0–20 | conforme linha | × 1,5 se até 30 cm | Incorporado até 30 cm, "quando possível" | — | p. 82, 85 |
| Faixa de plantio (frutíferas/florestais) | 0–20 | conforme linha | DC = NC × (LFA/DLP) × (100/PRNT) | Incorporado até 20 cm na faixa | — | p. 84 |

---

## 6. Travas e condições de não aplicação

| ID | Condição que dispara | Efeito | Onde se aplica | Página / fonte |
|---|---|---|---|---|
| TRV-01 | pH > pH de referência | "não há resposta econômica à calagem" | Geral | p. 67 |
| TRV-02 | **Tabela:** V ≥ 65% **e** saturação por Al na CTC < 10%. **Texto:** V "maior do que 65%" **e** saturação por Al "menor do que 10%", camada 0–10 cm | Tabela: "Não aplicar". Texto: "pode-se considerar não aplicar calcário" | Tab. 5.3-c (PD consolidado, grãos); Tab. 5.3-e (arroz em solo seco); Tab. 5.4-d (forrageiras anuais PD consolidado) | p. 73; Tab. 5.3 nota 1; Tab. 5.4 nota 1. 🔀 `INC-05` |
| TRV-03 | Ca trocável ≥ 4,0 **e** Mg trocável ≥ 1,0 cmol_c/dm³ | "Não aplicar" (mesmo com V ≤ 40% / V < 40%) | Arroz pré-germinado/transplante; campo natural; mandioca; espécies florestais; citronela e chá | p. 74, 77, 80, 82; Tab. 5.3 n. 8; 5.4 n. 6; 5.5 n. 3; 5.6 n. 2; 5.7 n. 1 |
| TRV-04 | Uso de fosfatos naturais | Tabela: "Não adicionar calcário quando do uso de fosfatos naturais." Texto: "Não é recomendada a adição de calcário anteriormente ou juntamente com fosfatos naturais, pois a liberação de P desse fertilizante é inibida pela elevação do pH e pelos altos teores de Ca." | Campo natural | p. 77; Tab. 5.4 n. 7. 🔀 `INC-09`; ⚠️ `LAC-31` (janela de tempo de "anteriormente" não quantificada) |
| TRV-05 | Arroz irrigado pré-germinado ou transplante de mudas | "não há necessidade de aplicar calcário como corretivo da acidez do solo" (exceto "alguns solos orgânicos"). Só se aplica calcário para Ca/Mg via V% | Arroz irrigado | p. 74; Tab. 5.1 n. 1 |
| TRV-06 | Condição de aplicação não satisfeita: pH ≥ 5,5 (grupos 6,0 e 5,5); pH ≥ 6,0 (grupos 6,5); saturação por Al ≤ 10% (grupos 5,5 que exigem "Al% > 10"); V > 40% (grupos sem pH) | Sem indicação de calagem. As tabelas escrevem apenas a condição **para aplicar** (coluna "Tomada de decisão"); a não aplicação é a leitura complementar | Tab. 5.3–5.7 | ⚠️ `LAC-25`: o manual não escreve a regra complementar ("não aplicar se…") para estes casos, nem trata a igualdade exata fora do que o sinal estrito indica |
| TRV-07 | Batata cultivada em rotação com culturas de pH de referência 6,0 | "manter o valor de referência do pH limitado a 5,5; caso contrário, poderão ocorrer problemas na qualidade dos tubérculos" | Batata | p. 80. 🔀 `INC-20`; ⚠️ `LAC-37` |
| TRV-08 | Aplicação superficial | "Quantidade aplicada em superfície limitada a 5 t/ha (PRNT 100%)" (teto de dose, não impede a aplicação) | Tab. 5.3-c; 5.4-d; 5.4-e; 5.5-c; reaplicação de "demais frutíferas" (Tab. 5.6 n. 3) | Tab. 5.3 n. 5; 5.4 n. 5; 5.5 n. 2; 5.6 n. 3. ⚠️ `LAC-06`, `LAC-07` |
| TRV-09 | PD com acidez já corrigida em profundidade e pH < pH de referência (mesmo < 5,5) | A reaplicação "não precisa ser feita imediatamente". Usar saturação por Al e V% como critérios auxiliares | PD | p. 69 (sem limiares além de TRV-02) |
| TRV-10 | Culturas "não responsivas" à correção da acidez (mandioca, florestais, citronela, chá, arroz pré-germinado, campo natural) | Não se usa SMP para correção de acidez. Só a regra V → 40% para Ca/Mg | Grupos "sem pH" | p. 67, 80, 82, 84; Tab. 5.1 |
| TRV-11 | Grupos pH 5,5 (batata, batata-doce, palmeiras, amoreira-preta, mirtilo, palm. juçara, alfavaca etc.) com pH < 5,5 mas saturação por Al ≤ 10% | Condição de aplicação não satisfeita (a decisão exige as duas condições) | Tab. 5.5-d; 5.6-b; 5.7-c | p. 79–80, 82 |

⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-06`: sobre o teto de 5 t/ha, o manual não diz se a dose é truncada em 5, se o excedente deve ser parcelado/adiado, nem se o teto se compara com a dose em PRNT 100% antes da conversão para o produto comercial (o texto apenas qualifica "(PRNT 100%)").

⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-07`: o teto de 5 t/ha está escrito apenas para as linhas listadas em TRV-08. Não é mencionado para: ½ SMP no início do PD em campo natural (p. 73); PD consolidado de medicinais (p. 85); aplicação superficial em florestais "em qualquer época" (p. 84); dose por V% ajustada para superfície (p. 72).

⚠️ **NÃO EXPLÍCITO NO MANUAL** — `LAC-27`: no PD consolidado, o texto (p. 73) torna a trava TRV-02 facultativa ("pode-se considerar"), enquanto a nota da tabela é imperativa ("Não aplicar"). A ordem de avaliação (primeiro pH < 5,5, depois a trava) também não é escrita.

---

## 7. Casos especiais e exceções

| ID | Caso | Regra | Página |
|---|---|---|---|
| CE-01 | Campo natural de baixa acidez potencial (SMP > 5,5), início do PD com calcário superficial | ½ SMP para pH 6,0 | p. 73 |
| CE-02 | Reinício do PD (restrições na camada de 10 a 20 cm) | Incorporação por aração e gradagem; SMP médio de 0–10 e 10–20; pH 6,0; fosfatagem com P médio (Cap. 6); avaliação por engenheiro agrônomo | p. 74; Tab. 5.3-d |
| CE-03 | Escarificação/subsolagem no PD | Incorporação localizada, não corrige todo o volume; com acidez em 10–20 cm pode aumentar a acidez superficial em manchas | p. 73–74 |
| CE-04 | Primeira calagem vs. reaplicação | Primeira: SMP obrigatório ("devem") e incorporação o mais profundo (≥ 20 cm). Reaplicação: SMP, V% ou média, a critério do técnico | p. 69, 71 |
| CE-05 | Solos de baixo poder tampão (arenosos e/ou pobres em MO, geralmente SMP > 6,3) | Equações polinomiais | p. 72 |
| CE-06 | Arroz irrigado pré-germinado/transplante | Sem calagem corretiva (pH sobe para ~6,0, exceto alguns solos orgânicos); dolomítico para V → 40% | p. 74 |
| CE-07 | Arroz irrigado em solo seco (irrigação 20–30 dias após a emergência) | pH ref 5,5; pH < 5,5 (0–20); SMP pH 5,5 | p. 74 |
| CE-08 | Arroz em rotação com sequeiro (incl. pastagens cultivadas) | Corrigir conforme a cultura mais sensível à acidez | p. 74 |
| CE-09 | Integração lavoura-pecuária | Forrageiras seguem a Tabela 5.3 (grãos) | p. 77; Tab. 5.4 n. 4 |
| CE-10 | Batata em rotação com culturas pH 6,0 | pH de referência limitado a 5,5 | p. 80 |
| CE-11 | Alfafa — renovação | Nova análise; se indicar necessidade, incorporar 0–20 | p. 76 |
| CE-12 | Aspargo — reimplantação | Nova análise; mesmo critério; incorporar 0–20 | p. 79 |
| CE-13 | Forrageiras perenes — anos subsequentes | Critérios do PD consolidado de anuais | p. 76; Tab. 5.4 n. 3 |
| CE-14 | Campo natural | V% → 40%, dolomítico, superficial, sem revolvimento; exceção Ca/Mg; não com fosfatos naturais | p. 77 |
| CE-15 | Mandioca | Não responde à correção; V → 40%, dolomítico, incorporado antes do plantio | p. 80 |
| CE-16 | Espécies florestais | Tolerantes ao Al; V → 40%, dolomítico, incorporado no plantio; superficial "em qualquer época" se Ca e/ou Mg baixos; deixar cascas na gleba | p. 82, 84 |
| CE-17 | Faixa de plantio (perenes de grande espaçamento) | Área total é o "mais recomendado"; faixa opcional com incorporação até 20 cm e equação DC | p. 84; Tab. 5.6 n. 1 |
| CE-18 | Eucalipto | Aplicação em área total com incorporação só na faixa → não usar a equação DC | p. 84 |
| CE-19 | Incorporação até 30 cm | Dose × 1,5 (macieira/oliveira; demais frutíferas; roseira de corte) | p. 82, 85 |
| CE-20 | Frutíferas de ciclo longo em produção | Reaplicação superficial em área total, ½ SMP pH 5,5, limitada a 5 t/ha | Tab. 5.6 n. 3 |
| CE-21 | Citronela e chá | Indiferentes à elevação do pH; calagem só para Ca e Mg (V → 40%) | p. 84–85; Tab. 5.7 |
| CE-22 | Plantio em covas (solos pedregosos, áreas muito declivosas) | Calcário em toda a área e incorporado na cova no preparo | p. 85 |
| CE-23 | Solos degradados ou nunca corrigidos (medicinais etc.) | Incorporar em toda a área sempre que possível | p. 85 |
| CE-24 | Crisântemo de corte | Mesma regra da roseira, mas incorporação 0–20 cm (sem 1,5×) | p. 85 |
| CE-25 | Ornamentais em vasos | Mesmas recomendações do solo, ajustadas à massa do substrato | p. 85 |
| CE-26 | Ornamentais — aceleração | Calcário extrafino (opcional) | p. 85 |
| CE-27 | Corretivo dolomítico | Indicado (texto) para arroz pré-germinado, campo natural, mandioca, florestais; "preferível" em todas as situações para ornamentais | p. 74, 77, 80, 82, 85 |
| CE-28 | Solos virgens (acidez natural) | "praticamente não há mais solos com acidez natural, exceto os campos e florestas naturais ainda não incorporados aos sistemas produtivos" | p. 66 |

---

## 8. Notas técnicas e observações do manual

- **NT-01 (p. 71).** A correspondência pH → V% "ainda não" foi calibrada para solos do RS e SC ("se assume uma provável correspondência"). Repetido na p. 71–72: "não houve calibração para estabelecimento das saturações por bases desejadas pelas culturas".
- **NT-02 (p. 65–66) — acidez natural.** Os solos ácidos resultam do processo de formação ("alta atividade do H+ em solução"). Com a intemperização, o Al é liberado (Al+3 livre), ocorre lixiviação de bases e os grupos funcionais dos coloides (em especial da MO) permanecem protonados. Resultado: "alta acidez ativa (baixo pH) e alta acidez potencial (altos valores de H+Al), alta saturação da CTC por Al e baixa saturação da CTC por bases."
- **NT-03 (p. 66).** "…o potencial de toxidez às raízes aumenta em profundidade no perfil do solo, devido à menor complexação de Al pela matéria orgânica, que se encontra em menores teores, e pelos menores teores de cátions básicos (especialmente Ca, Mg e K)."
- **NT-04 (p. 66).** Em casos avançados, os coloides inorgânicos (óxidos de Fe e caulinita) adsorvem muito fosfato, com consequente baixa disponibilidade de P.
- **NT-05 (p. 66).** "…a acidez natural é oriunda de processos extremamente lentos (escala milenar)".
- **NT-06 (p. 66).** "…as doses de calcário necessárias à neutralização dessa acidez são, geralmente, elevadas e os melhores resultados agronômicos ocorrem quando for corrigida a massa total de solo onde predomina o crescimento do sistema radicular."
- **NT-07 (p. 66) — reacidificação.** Depois de corrigido, o solo reacidifica "sem necessariamente retornar ao mesmo estado de acidez potencial anterior". Ca e Mg continuam mais altos do que em solos virgens, o que diminui a saturação por Al mesmo com pH baixo. Por isso, "é possível que a acidez ativa esteja alta (pH baixo), sem que ocorram os mesmos danos às plantas pelo Al, indicando que o pH isoladamente pode não ser o melhor indicador de tomada de decisão para a adição de calcário nessas situações."
- **NT-08 (p. 66).** Solos já corrigidos "não são mais tão ácidos quanto foram no passado e, se for necessário fazer sua correção, as doses de calcário deverão ser mais baixas do que aquelas inicialmente aplicadas."
- **NT-09 (p. 67).** A reacidificação se dá "predominantemente a partir da superfície", pela água da chuva ("principal introdutor de H+"), por reações de insumos ("especialmente os fertilizantes nitrogenados") e pela atividade biológica.
- **NT-10 (p. 67).** Os critérios devem considerar: cultivos anuais em áreas nativas ou com calagem prévia, e sistemas com ou sem revolvimento (convencional ou plantio direto).
- **NT-11 (p. 69).** A toxidez do Al "é uma das maiores limitações de solos ácidos e influencia a resposta econômica da reaplicação de calcário."
- **NT-12 (p. 71).** Os valores V% "representam valores médios de vários solos e, portanto, são aproximados."
- **NT-13 (p. 71).** Diferença SMP × V% (RN-16): com alta acidez potencial e/ou Ca e Mg elevados, V% tende a indicar dose menor, o que pode dar pH abaixo do desejado e/ou menor efeito residual.
- **NT-14 (p. 72).** Em solos de baixo poder tampão, o SMP "pode subestimar a acidez potencial".
- **NT-15 (p. 73, 77, 79).** Justificativa do ¼: a dose "é suficiente para neutralizar a acidez que se forma na camada de 0 a 5 cm". Na p. 79 o mecanismo é atribuído à "migração de partículas finas de calcário ou de seus produtos de dissociação no perfil".
- **NT-16 (p. 79–80).** Batata: "depreciação que pode ocorrer na qualidade dos tubérculos de batata em pH mais elevado".
- **NT-17 (p. 82).** Florestais: "as respostas a calagem são atribuídas, principalmente, ao adequado suprimento de Ca e de Mg às plantas."
- **NT-18 (p. 84).** Culturas perenes: preferência pela área total, "até porque é possível cultivar espécies anuais ou semiperenes nas entrelinhas, especialmente, durante a formação do pomar ou da floresta."
- **NT-19 (p. 84).** Colheita florestal: "boa parte do Ca é exportada com a casca das árvores".
- **NT-20 (p. 84).** Plantas bioativas: pH fora dos níveis recomendados pode afetar a produtividade, "a qualidade e a quantidade dos princípios ativos" e até causar a morte das plantas.
- **NT-21 (Tab. 5.2 nota 1).** Base de dados da Tabela 5.2: Murdock et al. (1969); Kaminski (1974); Scherer (1976); Ernani & Almeida (1986); Anjos et al. (1987); Ciprandi et al. (1994).
- **NT-22 (p. 71).** Referência do método V% com H+Al via SMP: Quaggio et al. (1986).
- **NT-23 (p. 67).** O agrupamento por pH de referência é conhecido "Desde meados dos anos 70".

---

## 9. Lacunas identificadas (⚠️ NÃO EXPLÍCITO NO MANUAL) — lista consolidada

| ID | Lacuna | Onde aparece |
|---|---|---|
| LAC-01 | SMP fora do passo de 0,1 da Tabela 5.2 (ex.: 5,63; média 5,45): arredondar, truncar ou interpolar não é definido | MET-01; RN-37 |
| LAC-02 | SMP > 7,1: a tabela termina em 7,1 (dose 0), sem linha "≥ 7,1" | MET-01 |
| LAC-03 | Nenhuma variável tem faixa de validade, precisão ou regra de rejeição declarada | Seção 2 |
| LAC-04 | Sem regra de arredondamento da dose final (após ¼, ½, 1,5×, PRNT, LFA/DLP) | MET-06 |
| LAC-05 | Conversão PRNT 100% → produto comercial só está escrita na equação da faixa (p. 84) | MET-06; MET-07 |
| LAC-06 | Teto de 5 t/ha: truncar vs. parcelar; comparação antes/depois da conversão de PRNT | TRV-08 |
| LAC-07 | Teto de 5 t/ha não mencionado para: ½ SMP campo natural (p. 73), medicinais PD (p. 85), florestais superficiais (p. 84), V% ajustado para superfície (p. 72) | TRV-08 |
| LAC-08 | Ajuste ±5 pp de V1: facultativo ou obrigatório; valor exato ("cerca de"); limites CTC = 7,5 e = 15; se vale para V1 = 40% | MET-02 |
| LAC-09 | Equação SMP → H+Al não fornecida; papel da estimativa de H+Al na fórmula de V% não explicado | MET-02 |
| LAC-10 | Unidade da CTC não consta na definição das variáveis da fórmula V% (cmol_c/dm³ só no parágrafo anterior); sem fator de conversão para t/ha | MET-02 |
| LAC-11 | Resultado nulo/negativo (V2 ≥ V1; polinomial com MO e Al baixos): sem instrução | MET-02; MET-04 |
| LAC-12 | Gatilho das equações polinomiais: "geralmente SMP > 6,3" é descritivo; "baixo poder tampão", "arenoso", "pobre em MO" sem limiares | MET-04 |
| LAC-13 | Faixa de validade das equações polinomiais não declarada; prioridade entre "primeira calagem → SMP" e "baixo poder tampão → polinomial" não definida | MET-04 |
| LAC-14 | Ajuste para aplicação superficial está escrito para V%, não para as polinomiais; camada de MO e Al não dita explicitamente | MET-04 |
| LAC-15 | "Média" dos critérios na reaplicação: quais critérios, qual ponderação, qual padrão | MET-05 |
| LAC-16 | Sem ordem de prioridade quando várias condições de roteamento ou de restrição são verdadeiras; lógica E/OU dos fatores de "restrição" | 3.9; 5.2.d |
| LAC-17 | Tab. 5.3-d escreve "Al ≥ 30%", sem "saturação por" | 5.2.d |
| LAC-18 | "Média" do SMP das duas camadas no reinício do PD: simples ou ponderada | RN-37 |
| LAC-19 | No ¼ SMP do PD consolidado, o texto não diz de qual camada vem o SMP (0–10 inferido pela coluna Amostragem; a Tab. 5.2 é para 0–20) | RN-33; RN-49; RN-57 |
| LAC-20 | CE-01 (½ SMP em campo natural): camada, critério de decisão e teto não informados; "acidez potencial elevada" sem limiar | CE-01 |
| LAC-21 | Frequência do "monitoramento frequente" da camada de 10 a 20 cm (remete ao Cap. 3, não anexado) | RN-30 |
| LAC-22 | "Teor crítico" de P e K não definido nestas páginas (Cap. 6) | Tab. 5.3–5.6 |
| LAC-23 | "Produtividade abaixo da média local", "anos de estiagem", "compactação" sem critérios mensuráveis | RN-36 |
| LAC-24 | Fórmulas de saturação por Al (e qual CTC) e de V% não fornecidas | Seção 2 |
| LAC-25 | A regra complementar "não aplicar" (pH ≥ limiar, Al% ≤ 10, V > 40) não está escrita; igualdade exata em "pH maior que o valor de referência" (p. 67) não tratada | TRV-06 |
| LAC-26 | V ≥ 65% (tabela) vs. V > 65% (texto) — ver INC-05 | TRV-02 |
| LAC-27 | Trava TRV-02 facultativa (texto) vs. imperativa (tabela); ordem de avaliação não definida | TRV-02 |
| LAC-28 | Trava da nota (1) no arroz em solo seco: não citada no texto; camada não dita | RN-43 |
| LAC-29 | Forrageiras perenes, anos seguintes: texto cita só amostragem e decisão do PD consolidado; nota (3) fala em "recomendação" (dose ¼ implícita) | RN-47 |
| LAC-30 | Campo natural: fórmula V% (calibrada para 0–20) aplicada em superfície com amostragem 0–10, sem fator de redução | MET-03; RN-51 |
| LAC-31 | Fosfatos naturais: "anteriormente" sem janela de tempo | TRV-04 |
| LAC-32 | Alfafa: sem regra de reaplicação entre implantação e renovação; sem opção superficial | RN-46 |
| LAC-33 | Aspargo: sem regra de reaplicação entre implantação e reimplantação | RN-54 |
| LAC-34 | Olerícolas, início do PD: critério de decisão só na tabela | RN-56 |
| LAC-35 | Olerícolas PD consolidado sem a trava V ≥ 65%/Al < 10% (ver INC-18) | RN-57 |
| LAC-36 | Grupo pH 5,5 de hortaliças ("Qualquer um"): sem regra específica para PD consolidado | RN-60 |
| LAC-37 | Batata em rotação: critério de decisão e dose para as culturas pH 6,0 da rotação não definidos; batata-doce em rotação não mencionada | TRV-07 |
| LAC-38 | Incorporação até 30 cm: "quando possível"/"preferencialmente" sem critério objetivo; combinação com a equação DC (faixa até 20 cm) não definida | MET-07; RN-64; RN-66 |
| LAC-39 | Equação DC: NC não qualificada como "PRNT 100%"; DC por ha de área total não dito | MET-07 |
| LAC-40 | Reaplicação em frutíferas: só para "Demais frutíferas"; "ciclo longo" indefinido; camada de amostragem não informada | RN-67 |
| LAC-41 | Frutíferas: sistema de manejo (PD/convencional) não tratado | 5.5 |
| LAC-42 | Florestais "Ca e/ou Mg baixos" sem limiar; "e/ou" vs. "e" da exceção; teto de 5 t/ha não citado; tabela diz "Incorporado" | RN-72 |
| LAC-43 | Lista de "espécies florestais" não definida no item 5.2.5 (erva-mate, araucária etc. só aparecem na Tab. 5.1) | RN-68 |
| LAC-44 | "Culturas de grãos", "demais olerícolas", "demais frutíferas", "espécies perenes"/"cultivos anuais" (forrageiras) não são enumerados; o enquadramento das culturas da Tab. 5.1 nas Tab. 5.3–5.7 não é explícito (ver Apêndice A) | Tab. 5.3–5.7 |
| LAC-45 | Manjericão e salsa (Tab. 5.1, pH 5,5) sem linha em nenhuma tabela de critérios | 5.6 |
| LAC-46 | Medicinais PD consolidado: camada, teto, trava e alvo para os grupos 6,5 e 5,5 não definidos | RN-77 |
| LAC-47 | Covas: sem fórmula de dose por cova | MET-08; RN-78 |
| LAC-48 | Vasos: sem fórmula de conversão para a massa de substrato | MET-08; RN-87 |
| LAC-49 | (reservado — não utilizado) | — |
| LAC-50 | "Calcário extrafino" e "dolomítico" sem especificação técnica | RN-86; RN-88 |
| LAC-51 | Sem intervalo fixo de reanálise/reaplicação | RN-90 |
| LAC-52 | Não se sabe se o capítulo continua após a p. 87 | Seção 1.2 |
| LAC-53 | Antecedência da aplicação não quantificada ("preferencialmente antes da implantação de cultivos de inverno"; "antes da implantação da batata"; "anteriormente ao plantio") | RN-25; RN-58; RN-61 |
| LAC-54 | A coluna "Tomada de decisão" diz só "pH"; não afirma explicitamente que é pH em água | Seção 2 |
| LAC-59 | Reinício do PD: "pode ser necessário" + avaliação de agrônomo — sem regra determinística | RN-36; RN-39 |
| LAC-60 | Sem dose mínima operacional abaixo da qual a aplicação é dispensada | MET-01 |
| LAC-61 | "Alguns solos orgânicos" (arroz pré-germinado) não identificados e sem regra própria | RN-42 |

(Os números LAC-55 a LAC-58 não foram atribuídos.)

---

## 10. Inconsistências internas do manual (🔀) — lista consolidada

Nenhuma foi resolvida nesta transcrição. As duas versões estão registradas.

| ID | Tema | Versão A | Versão B |
|---|---|---|---|
| INC-01 | Camomila | Tab. 5.1 (p. 68): grupo **pH 6,0** | Tab. 5.1 (p. 68): **também** no grupo **pH 5,5**. (A Tab. 5.7, p. 86, coloca em **pH 6,0**.) |
| INC-02 | Batata-doce | Tab. 5.1 (p. 68): **pH 6,0** | Texto p. 79 ("pH 5,5 (palmeira-real, pupunheira, batata e batata doce)"), p. 79–80 e Tab. 5.5-d (p. 81): **pH 5,5**, com decisão pH < 5,5 e Al% > 10 |
| INC-03 | Chá e citronela | Tab. 5.1 (p. 68): "chá" e "citronela-de-Java" no grupo **pH 5,5** | Texto p. 84–85 ("indiferente à elevação do pH") e Tab. 5.7-d (p. 86): **sem pH de referência**, V ≤ 40%. Nomes também variam: "citronela-de-Java" (Tab. 5.1), "citronela (Cymbopogon winterianus)" (p. 84), "Citronela" (Tab. 5.7) |
| INC-04 | Limiar de V% para Ca/Mg | Texto: "menor do que 40%" (**V < 40%**) — p. 74 (arroz), p. 77 (campo natural), p. 80 (mandioca), p. 82 (florestais) | Tabelas: "**V ≤ 40%**" — Tab. 5.3-f, 5.4-e, 5.5-e, 5.6-d, 5.7-d |
| INC-05 | Trava do PD consolidado | Texto p. 73: V "**maior do que 65%**" e saturação por Al "menor do que 10%"; facultativa ("pode-se considerar não aplicar") | Tab. 5.3 n. 1 e Tab. 5.4 n. 1: "**V ≥ 65%** e saturação por Al na CTC <10%"; imperativa ("Não aplicar") |
| INC-06 | Referência cruzada de itens | p. 69: critérios "nos itens **5.2.2** a 5.2.8" | p. 72: "Tabelas 5.3 a 5.7 dos itens **5.2.3** a 5.2.8"; p. 87: "itens **5.2.3** a 5.2.8 e nas tabelas 5.3 a 5.7" — mas a Tabela 5.3 (grãos) está no item 5.2.2 |
| INC-07 | Abrangência do item 5.3 | p. 87 lista: grãos, forrageiras, olerícolas, tubérculos, raízes, ornamentais, aromáticas, condimentares, medicinais, outras comerciais — **sem frutíferas e florestais** | A mesma frase remete às "tabelas 5.3 a 5.7", que **incluem** a Tab. 5.6 (frutíferas e florestais) |
| INC-08 | Momento da adubação corretiva de P e K | Tab. 5.3 n. 2: "aproveitando a mobilização do solo pela calagem" | Tab. 5.4 n. 2: "incorporando fertilizantes **após** a calagem"; Tab. 5.5 n. 1 e Tab. 5.6 n. 4: "**juntamente** com a calagem" |
| INC-09 | Fosfatos naturais (campo natural) | Texto p. 77: não adicionar calcário "**anteriormente ou juntamente**" com fosfatos naturais | Tab. 5.4 n. 7: "Não adicionar calcário **quando do uso** de fosfatos naturais" (sem delimitação temporal) |
| INC-10 | Modo de aplicação em florestais | Tab. 5.6-d: "**Incorporado**"; p. 82: "incorporando o calcário no momento do plantio" | p. 84: "Em qualquer época … aplicando o calcário **superficialmente**, seguindo os critérios da Tabela 5.6" |
| INC-11 | Alvo de pH na reaplicação de "demais frutíferas" | Tab. 5.6-c: pH de referência **6,0**; dose de implantação "1 SMP para pH 6,0" | Tab. 5.6 n. 3 (reaplicação): "½ do que o índice SMP indicar para pH **5,5**" |
| INC-12 | Grupo pH 5,5 de frutíferas | p. 82 (grupos): "amora-preta, mirtilo e palmeira-juçara"; p. 82 (regra): cita só "a amora-preta e o mirtilo" | Tab. 5.6-b: "Amoreira-preta, mirtilo, palm. juçara"; Tab. 5.1: "amoreira-preta" (nome difere de "amora-preta") |
| INC-13 | Reaplicação em forrageiras perenes | Texto p. 76: seguem-se os "critérios de **amostragem e de tomada de decisão**" do PD consolidado | Tab. 5.4 n. 3: "utilizar **recomendação** de plantio direto consolidado" (abrange também a dose) |
| INC-14 | (reservado — não utilizado) | — | — |
| INC-15 | Ajuste superficial da dose por V% | p. 72: a dose por V% corresponde a 0–20 cm, e é "necessário um ajuste da dose, caso a aplicação seja em superfície" | Tab. 5.4-e (campo natural): fórmula integral "NC=(40-V%)/100 *CTC_pH7,0" com modo "Superficial" e amostragem 0–10, sem fator de ajuste |
| INC-16 | Critério de restrição na camada de 10 a 20 cm | Texto p. 74: "saturação por Al for ≥30%" + área "não … implantada com a correção da acidez na camada de 0 a 20 cm" + fatores qualitativos; não menciona pH | Tab. 5.3-d: "pH < 5,5 e Al ≥ 30%"; sem menção à condição de implantação |
| INC-17 | PD consolidado em medicinais/aromáticas/condimentares | Texto p. 85: superficial, ¼ da dose para pH **6,0**, "semelhantemente a todas as demais culturas" | Tab. 5.7: sem coluna de sistema de manejo; todas as linhas "Incorporado"; grupos com alvo 6,5 e 5,5 |
| INC-18 | Trava V/Al no PD consolidado | Tab. 5.3-c e 5.4-d: decisão "pH < 5,5⁽¹⁾" com a trava V ≥ 65%/Al < 10% | Tab. 5.5-c (olerícolas PD consolidado): "pH < 5,5" **sem** a nota da trava |
| INC-19 | (fundida em INC-02) | — | — |
| INC-20 | Regra de rotação | p. 67 e p. 74: usar o pH de referência "da cultura mais sensível (a que exigir o pH mais elevado)" | p. 80: batata em rotação com culturas pH 6,0 → "manter o valor de referência do pH limitado a 5,5" (exceção explícita que contraria a regra geral) |
| INC-21 | Cabeçalho de amostragem | Tab. 5.3, 5.4, 5.6, 5.7: "Amostragem do solo (cm)" | Tab. 5.5: "Amostragem" (sem unidade) |
| INC-22 | Nome do campo natural | Tab. 5.1: "pastagem natural" | Tab. 5.4: "Campo natural"; p. 77: "pastagens em campos naturais" |

---

## Apêndice A — Cruzamento Tabela 5.1 × Tabelas de critérios 5.3–5.7

Só estão listadas as culturas **nomeadas** em alguma das Tabelas 5.3–5.7 ou no texto dos itens 5.2.2–5.2.8. "Grupo genérico" = a tabela usa um rótulo coletivo e o manual não enumera as culturas incluídas (`LAC-44`).

| Cultura (grafia da Tab. 5.1) | pH ref. Tab. 5.1 | Tabela de critérios / linha | pH ref. na tabela de critérios | Situação |
|---|---|---|---|---|
| Arroz irrigado — semeadura em solo seco | 5,5 | 5.3-e | 5,5 | Consistente |
| Arroz irrigado — pré-germinado / transplante | sem | 5.3-f | — | Consistente |
| Arroz de sequeiro | 6,0 | "culturas de grãos" (p. 72: exceto arroz irrigado → 6,0) | 6,0 | Consistente (enquadramento em "grãos" implícito) |
| Alfafa | 6,5 | 5.4-a | 6,5 | Consistente |
| Pastagem natural | sem | 5.4-e ("Campo natural") | — | Consistente (nome difere — INC-22) |
| Aspargo | 6,5 | 5.5-a | 6,5 | Consistente |
| Palmeira-real | 5,5 | 5.5-d | 5,5 | Consistente |
| Pupunheira | 5,5 | 5.5-d | 5,5 | Consistente |
| Batata | 5,5 | 5.5-d | 5,5 | Consistente |
| Batata-doce | **6,0** | 5.5-d | **5,5** | **Divergente — INC-02** |
| Mandioca | sem | 5.5-e | — | Consistente |
| Macieira | 6,5 | 5.6-a | 6,5 | Consistente |
| Oliveira | 6,5 | 5.6-a | 6,5 | Consistente |
| Amoreira-preta | 5,5 | 5.6-b | 5,5 | Consistente |
| Mirtilo | 5,5 | 5.6-b | 5,5 | Consistente |
| Palmeira-juçara | 5,5 | 5.6-b | 5,5 | Consistente |
| Eucalipto | sem | 5.6-d (citado como florestal na p. 84) | — | Consistente |
| Araucária, acácia negra, bracatinga, cedro australiano, pinus | sem | 5.6-d (grupo genérico) | — | Enquadramento não explícito — LAC-43 |
| Erva-mate | sem | nenhuma linha nominal | — | Enquadramento não explícito — LAC-43 |
| Piretro | 6,5 | 5.7-a | 6,5 | Consistente |
| Camomila | **6,0 e 5,5** | 5.7-b | 6,0 | **Divergente — INC-01** |
| Capim-limão, estévia, hortelã, gengibre, palma-rosa, urucum, vetiver | 6,0 | 5.7-b | 6,0 | Consistente |
| Alfavaca, calêndula, cardamomo, carqueja, coentro, cúrcuma, erva-doce, funcho, guaco | 5,5 | 5.7-c | 5,5 | Consistente |
| Citronela-de-Java | **5,5** | 5.7-d ("Citronela") | **—** | **Divergente — INC-03** |
| Chá | **5,5** | 5.7-d | **—** | **Divergente — INC-03** |
| Manjericão | 5,5 | nenhuma | — | Ausente — LAC-45 |
| Salsa | 5,5 | nenhuma | — | Ausente — LAC-45 |
| Roseira de corte | 6,0 | 5.7-e | 6,0 | Consistente |
| Crisântemo | 6,0 | 5.7-e ("crisântemo de corte") | 6,0 | Consistente |
| Cana-de-açúcar | 6,0 | 5.7-f | 6,0 | Consistente |
| Tabaco | 6,0 | 5.7-f | 6,0 | Consistente |
| Consorciações, gramíneas e leguminosas forrageiras (fria/quente), ervilha forrageira, ervilhaca, nabo forrageiro | 6,0 | 5.4-b / 5.4-c / 5.4-d (grupos genéricos) | 6,0 | pH consistente; enquadramento perene/anual não explícito — LAC-44 |
| Demais culturas da lista pH 6,0 (ex.: amendoim, aveia, canola, centeio, cevada, ervilha, feijão, girassol, linho, milho, milho pipoca, painço, soja, sorgo, tremoço, trigo, triticale; hortaliças; frutíferas como abacateiro, ameixeira, bananeira, caquizeiro, citros, figueira, maracujazeiro, nectarineira, nogueira-pecã, pereira, pessegueiro, quivizeiro, videira; melancia, melão, morangueiro, mandioquinha-salsa etc.) | 6,0 | 5.3 ("grãos"), 5.5-b/c ("demais olerícolas") ou 5.6-c ("demais frutíferas") — grupos genéricos | 6,0 | pH consistente; enquadramento de cada cultura não explícito — LAC-44 |

---

*Fim da transcrição. Páginas cobertas: 65–87. Todas as regras citam a página impressa do manual.*
