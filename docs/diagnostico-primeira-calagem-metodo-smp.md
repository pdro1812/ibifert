# Diagnóstico — Impacto de Duas Mudanças Propostas (Calagem)

> **Status (2026-09-15): item 1 implementado.** O campo "Tipo de Aplicação"
> foi removido das duas telas de entrada (Calculadora e Inserção Rápida de
> Lotes) — todo cálculo agora é tratado como reaplicação, conforme decidido
> em conversa após a leitura deste diagnóstico. Detalhes de onde o campo
> continua existindo (schema/banco, por compatibilidade) e o que mudou de
> fato no comportamento estão no §1 abaixo, que passa a descrever o estado
> **anterior à mudança** — mantido como registro do porquê da decisão.
> Item 2 (SMP sempre, Polinomial opcional) segue **não implementado**.
>
> Fase de leitura — nenhum código alterado. Objetivo deste documento: mapear
> o comportamento **atual** do sistema nos dois pontos levantados pela
> orientadora, e avaliar o que aconteceria (quebra de aplicação? valor
> agronômico equivocado?) em cada leitura possível da mudança pedida —
> **antes** de qualquer implementação.

Escopo lido: `backend/src/schemas/calagemSchema.ts`,
`backend/src/services/{motorCalagem,calculadoraCalagem,tabelaSmp}.ts`,
`backend/src/routes/analisesRoutes.ts`, `backend/src/database/{schema,analises}.ts`,
`frontend/src/schemas/calagemSchema.ts`, `frontend/src/services/api.ts`,
`frontend/src/pages/{CalculadoraPage,NovaAnalisePage}.tsx`,
`docs_antigos/regras_calagem_graos_v2.md` (spec original do manual RS/SC 2016),
e os documentos já existentes em `docs/` (`02-calculo-calagem.md`,
`ref-calagem.md`, `plano-testes-validacao-agronoma.md`).

---

## Resumo executivo

| Pergunta da orientadora | O que o sistema faz hoje | Quebraria a aplicação? | Geraria valor equivocado? |
|---|---|---|---|
| **1. "Primeira calagem" vs "Reaplicação"** | Flag permanente por área (nunca mais volta a `true` depois da 1ª correção) — não é um ciclo anual. Controla se um **segundo número de referência** (Saturação por Bases) é calculado e exibido ao lado do resultado principal. | Não trava/crasha, mas a regra está **duplicada em 4 arquivos** (ver §1.5) — mudar em só um lugar gera inconsistência entre telas. | **Não**, para a dose oficial (`NC_final`/`NC_ajustada`) — essa referência é só informativa, nunca substitui o cálculo principal. Passaria a **pedir 2 campos a mais** (`V_atual`, `CTC_pH7`) em todo cálculo por método SMP, contrariando o manual ("nunca aparecem em primeira calagem"). |
| **2. "Sempre método SMP"** | **Já não é escolha do usuário** — é 100% automático a partir do valor de SMP medido (`SMP > 6.3` → Polinomial; `SMP ≤ 6.3` → tabela SMP). Não é preferência de tela, é regra de química do solo. | Depende da leitura (ver §2.3) — se for só reordenar a interface, não quebra nada. | **Sim, e de forma severa**, se a leitura for "forçar tabela SMP mesmo quando SMP > 6,3": no próprio cenário C3 já usado para validação (SMP=6,8, MO=3,0, Al=1,5), a dose cairia de **5,55 t/ha para 0,3 t/ha** — uma subestimação de ~18x, exatamente o erro que essa regra existe para evitar. |

Detalhamento de cada ponto abaixo.

---

## 1. "Primeira calagem" vs "Reaplicação" — o que o campo controla hoje

### 1.1 Definição — o que a spec e o código dizem

O campo `primeira_calagem` é descrito no glossário da spec original assim:

> `primeira_calagem` | Indica se é a **primeira correção da área** | Boolean
> — `docs_antigos/regras_calagem_graos_v2.md:25`

E na ordem de coleta:

> Booleano: **Sim (primeira vez)** / **Não (reaplicação)**
> — `docs_antigos/regras_calagem_graos_v2.md:40`

Isso responde diretamente sua primeira pergunta: **é a leitura (a)**, não a (b).
`primeira_calagem = true` significa "esta área nunca recebeu calagem antes"
(ex.: abertura de campo natural/nativo). Não é um contador de safra — uma vez
que a área recebeu a primeira correção, **toda aplicação seguinte é
"reaplicação" para sempre**, não importa se foi 1 ano ou 10 anos depois. Não
existe, hoje, a noção "ano 1 = primeira, ano 2 = reaplicação, ano 3 = ?" — o
sistema só tem os dois estados permanentes.

Na tela (`frontend/src/pages/CalculadoraPage.tsx:554-567`), isso aparece como
um único `<select>` "Tipo de Aplicação" com duas opções: "Primeira calagem" /
"Reaplicação", exatamente 1:1 com o booleano.

**Sua leitura sobre a região está coerente com a spec**: se praticamente
todas as áreas de vocês já são estruturadas (já receberam calagem alguma
vez), a opção "Primeira calagem" só se aplicaria a abertura de área nova
(campo nativo/virgem) — cenário raro, mas que o sistema já reconhece
separadamente: existe uma opção só para `PD_IMPLANTACAO`, "Superficial —
Campo Natural" (`opcao_superficial_campo_natural`, `CalculadoraPage.tsx:592-593`),
que é o caso mais associado a solo nunca corrigido. São dois campos
distintos hoje (um não implica o outro automaticamente), mas conceitualmente
cobrem a mesma situação real.

### 1.2 O que a resposta controla de fato (não é só rótulo)

Quando `primeira_calagem = false` (reaplicação) **e** o método roteado é SMP
(`SMP ≤ 6.3`), três coisas acontecem (`motorCalagem.ts:77-78`, `:165-176`):

1. Passa a exigir 2 campos extras no formulário: `V_atual` e `CTC_pH7`
   (`calagemSchema.ts` backend `:144-160`, espelhado no frontend
   `frontend/src/schemas/calagemSchema.ts:100-116`).
2. Calcula uma **segunda dose de referência**, `NC_vb`, pelo método
   Saturação por Bases (`calcularNCVB`, `calculadoraCalagem.ts:44-57`) —
   exibida ao lado do resultado principal (`CalculadoraPage.tsx:978-983`).
3. Mostra uma nota fixa avisando que "a escolha do método é decisão do
   técnico" (`MSG_NOTA_REAPLICACAO`).

**Ponto importante: `NC_vb` nunca substitui `NC_final`/`NC_ajustada`.** O
valor oficialmente adotado sempre vem do método roteado (SMP ou Polinomial)
— `NC_vb` é só uma referência informativa em paralelo
(`motorCalagem.ts:160-176`, confirmado também no cenário **C9** do plano de
testes, onde o resultado final adotado continua sendo o do método SMP).
Ou seja: **essa flag não tem poder de alterar a dose recomendada** — só
decide se um número adicional de comparação aparece na tela.

Achado colateral (não é efeito da mudança pedida, é um comportamento já
existente hoje): a trava "solo tamponado" do PD Consolidado
(`V_atual ≥ 65% E Al_sat < 10% → não aplicar`, `motorCalagem.ts:113-118`)
só consegue disparar quando `V_atual` foi coletado — e hoje `V_atual` só é
pedido nesse fluxo quando é **reaplicação** (via a mesma tela do item 2
acima). Ou seja, hoje essa trava **nunca dispara** para uma "primeira
calagem" em PD Consolidado, mesmo que o solo já esteja tamponado — porque o
sistema simplesmente não pergunta `V_atual` nesse caso. A spec original já
previa isso de outro jeito ("V_atual... se ainda não coletado, solicitá-lo
junto com Al_sat", `docs_antigos/regras_calagem_graos_v2.md:211`), e o
**schema do frontend já implementa uma regra própria e mais estrita** para
isso (`frontend/src/schemas/calagemSchema.ts:128-135`, exige `V_atual`
sempre que for reaplicação + PD Consolidado + pH<5,5, mesmo fora do fluxo
SMP) **que o backend não replica** — uma divergência front/back que já
existe hoje, independente do pedido da orientadora, mas que vale registrar
porque qualquer mudança na semântica de `primeira_calagem` mexe exatamente
nessa área.

### 1.3 Se a distinção fosse removida (ou sempre tratada como reaplicação)

**Não corrompe a dose principal.** Como só afeta `NC_vb` (referência) e a
lista de campos pedidos, forçar sempre "reaplicação" não muda o valor de
`NC_final`/`NC_ajustada` calculado hoje para nenhum sistema de manejo.

O que muda de fato:

- **Passa a pedir `V_atual` e `CTC_pH7` sempre** que o método roteado for
  SMP — isto é, na maioria dos casos, segundo a própria observação da
  orientadora sobre o perfil de solo da região. Isso contraria o texto do
  manual ("Para primeira calagem, use sempre o valor SMP" e "estes dois
  campos nunca aparecem em primeira calagem",
  `docs_antigos/regras_calagem_graos_v2.md:63,386`) — pedir esses campos
  numa abertura de área nova não é agronomicamente incorreto (CTC e V% são
  medidos em qualquer análise de solo), só deixa de seguir a lógica de
  "não pedir campo sem necessidade" que o manual definiu.
- **Efeito colateral positivo**: resolveria de tabela o achado do §1.2 —
  a trava "solo tamponado" do PD Consolidado passaria a poder disparar
  mesmo em áreas hoje marcadas como "primeira calagem".
- **A regra está reimplementada em 4 lugares** (mapa completo em §1.5) —
  qualquer mudança de semântica precisa ser replicada nos 4, ou as telas
  ficam inconsistentes entre si (uma pede campo que a outra não pede).

### 1.4 Blast radius — tudo que referencia `primeira_calagem` hoje

19 arquivos referenciam o campo. A maioria é passthrough (só grava/exibe o
valor); a lista abaixo separa por tipo de impacto real:

| Papel | Arquivos | O que precisa de atenção numa mudança |
|---|---|---|
| **Lógica de negócio duplicada** (mudar a regra aqui = mudar em todos) | `backend/src/schemas/calagemSchema.ts` (fonte da verdade), `backend/src/services/{calculadoraCalagem,motorCalagem}.ts`, `frontend/src/schemas/calagemSchema.ts` (cópia zod local), `frontend/src/services/api.ts::sanitizarPayloadCalagem` (decide o que entra no payload), `frontend/src/pages/NovaAnalisePage.tsx::isCellEnabled` (cópia **independente e hardcoded**, tela de lançamento em lote) | São 4 lugares de UX/validação no frontend (mais o backend) decidindo "quando pedir V_atual/CTC_pH7". `NovaAnalisePage.tsx:57-89` nem importa a função compartilhada — reescreve o limiar `6.3` na mão. |
| **Persistência** | `backend/src/database/schema.ts` (coluna `primeira_calagem`), `backend/src/database/analises.ts` | Sem lógica condicional, só grava o booleano recebido — não quebra por si só. |
| **Exibição / relatório** | `ModalDetalhesAnalise.tsx`, `AdminAnalisesPage.tsx`, `TalhaoDetalhesPage.tsx`, `HistoricoAnalisesPage.tsx`, `AdminUsersPage.tsx`, `pdfGenerator.ts`, `adminRoutes.ts` | Só leem o campo para mostrar "Primeira calagem: Sim/Não" — se o campo for removido do formulário, precisam de um fallback de exibição, mas não têm regra própria. |
| **Testes que fixam o comportamento atual** | `backend/src/utils/calagem.test.ts` (vários dos 20 casos), `frontend/e2e/calculadora-blocos.spec.ts`, `frontend/src/pages/NovaAnalisePage.test.ts`, e os cenários **C7** e **C9** de `docs/plano-testes-validacao-agronoma.md` | C7 e C9 dependem explicitamente do valor `false` (reaplicação) para testar a trava do PD Consolidado e a comparação SMP×SatBases — precisariam ser revistos/reescritos junto com a mudança. |

**Boa notícia arquitetural**: o **backend é a única fonte de verdade para o
cálculo em si** — tanto `/api/analises/calcular` quanto `/api/analises/bulk`
(usado pela tela de lote `NovaAnalisePage.tsx`) chamam o mesmo
`validarEntrada()` + `executarMotorCalagem()`
(`analisesRoutes.ts:15-18,82-84`). Ou seja, mesmo que as 3 cópias de regra no
frontend fiquem temporariamente dessincronizadas entre si, o backend sempre
valida com força total antes de gravar — o risco realista de uma
divergência frontend é **erro de validação/campo faltando na tela** (UX
ruim), não **dado errado salvo no banco**.

---

## 2. "Sempre método SMP, Polinomial só em cenário característico"

### 2.1 Como funciona hoje — não é escolha do usuário

O método (SMP vs Polinomial) **já não é uma opção que o técnico escolhe**.
É 100% derivado do valor medido de SMP, via `rotearMetodoCalagem`
(`calculadoraCalagem.ts:69-71`, duplicada em
`frontend/src/schemas/calagemSchema.ts:194-196` e reescrita ainda uma
terceira vez, hardcoded, em `NovaAnalisePage.tsx:65`):

```
SMP > 6.3  → Polinomial (usa MO + Al_trocável, medidos direto)
SMP ≤ 6.3  → SMP (lookup na Tabela 5.2 do manual RS/SC)
```

A tela hoje só **mostra** qual método foi usado, depois do cálculo
(`CalculadoraPage.tsx:959`, rótulo "Método"); o técnico não clica em nada
para escolher.

### 2.2 Por que existe o roteamento — o risco concreto de "sempre SMP"

O comentário da spec original explica o motivo agronômico:

> `ENTÃO metodo_calc_roteado = POLINOMIAL` — *"SMP subestima acidez
> potencial em solos arenosos/baixo tamponamento"*
> — `docs_antigos/regras_calagem_graos_v2.md:150-151`

Ou seja: para solos com `SMP > 6,3` (tipicamente arenosos/pouco tamponados),
a tabela SMP **subestima** a real necessidade de calcário — por isso o
manual manda usar a fórmula Polinomial, que usa MO e Al trocável medidos
diretamente, nesses casos.

**Isso não é hipotético — já está no cenário C3 do próprio plano de testes
de vocês.** Com `SMP = 6.8`, `MO = 3.0`, `Al_trocável = 1.5`:

| Método | NC_base | NC ajustada (PRNT 80%) |
|---|---|---|
| Polinomial (correto para esse perfil, o que o sistema faz hoje) | **5,55 t/ha** | **6,94 t/ha** |
| Tabela SMP forçada (linha `smp: 6.8`, `tabelaSmp.ts:35`) | **0,30 t/ha** | **0,38 t/ha** |

Forçar a tabela SMP nesse perfil de solo geraria uma dose ~18x menor que a
correta — exatamente o erro sistemático que o roteamento automático existe
para evitar. Esse não é um caso de borda exótico: é um dos 9 cenários que
vocês já usam para validar o sistema.

### 2.3 Duas leituras possíveis do pedido da orientadora

O pedido é ambíguo entre duas implementações bem diferentes em risco:

**(a) Leitura cosmética/UX** — "não tratar o método como uma decisão visível
do usuário; a maioria dos casos já cai em SMP automaticamente, então não
precisa parecer uma escolha complexa." **Isso, na prática, já é o
comportamento atual** para qualquer solo com `SMP ≤ 6,3` — o técnico nunca
vê os campos de Polinomial (Bloco B3 só aparece quando
`SMP > 6,3`, `CalculadoraPage.tsx:646-658`). Não exigiria mudança de
cálculo, só eventualmente de texto/copy. **Risco: nenhum.**

**(b) Leitura literal** — "usar sempre a tabela SMP por padrão, e só trocar
para Polinomial se o técnico clicar em um botão tipo 'gostaria de usar o
método Polinomial?'". Isso **remove ou inverte o roteamento automático**:
o sistema passaria a confiar no técnico lembrar de identificar, sozinho, um
perfil de solo arenoso/pouco tamponado e clicar na opção certa — e se ele
não notar (o que é o comportamento mais provável exatamente por SMP ser "o
método usado na maioria dos casos", conforme a própria premissa do pedido),
o sistema entrega uma dose de calcário visivelmente plausível, porém
**subestimada**, sem nenhum alerta. **Risco: alto, e silencioso** — não
gera erro nem trava, só o número errado, na direção mais perigosa
(calcário de menos, não de mais).

### 2.4 Onde a regra vive hoje

Mesma duplicação já vista no item 1: `calculadoraCalagem.ts` (backend, fonte
da verdade), `frontend/src/schemas/calagemSchema.ts` (mesma fórmula
reexportada), e `NovaAnalisePage.tsx:64-66` (limiar `6.3` reescrito à mão,
sem importar a função). Vale registrar também um comportamento pré-existente
curioso, achado durante a leitura: no caso especial "PD Implantação,
superficial em campo natural", o motor **já ignora o roteamento** e consulta
a tabela SMP diretamente mesmo que `SMP > 6,3` (`motorCalagem.ts:189-196`) —
ou seja, já existe hoje um único ponto onde "forçar tabela SMP" acontece de
propósito. Não avaliei a fundo se esse caso specific é intencional (pode ser
— nesse fluxo o cálculo já usa 50% da dose e é sempre superficial, contexto
diferente), mas serve de referência de que esse tipo de bypass já tem
precedente no código, para o lado que se decidir seguir.

---

## 3. Efeito combinado, se as duas mudanças forem feitas na leitura literal

As duas regras se cruzam no mesmo trecho
(`calagemSchema.ts` backend `:144`; frontend `:77`):

```ts
calcular_tambem_sat_bases = !primeira_calagem && metodo === SMP
```

Se `primeira_calagem` for sempre tratado como `false` **e** o método for
sempre forçado para `SMP`, essa condição fica **sempre verdadeira** — todo
cálculo, sem exceção, passaria a exigir `V_atual` e `CTC_pH7`. Hoje isso só
acontece numa combinação específica (reaplicação + SMP ≤ 6,3); nas duas
leituras literais combinadas, viraria comportamento universal do
formulário. Vale ter isso em mente se as duas mudanças forem discutidas
juntas com a orientadora — o efeito de UX (campos extras) se soma.

---

## 4. Fora do escopo — o que não é afetado

- **Adubação (Calculadora de Adubação) não usa nada disso.** Não existe
  `primeira_calagem` nem roteamento SMP/Polinomial nesse motor — o conceito
  equivalente por lá é "Número do Cultivo" (1º/2º), que é uma regra
  completamente separada. As duas mudanças propostas não tocam nesse módulo.
- **As fórmulas em si não mudam.** Nenhuma das duas leituras discutidas
  exige alterar `calcularNCPolinomial6_0`, `calcularNCVB`, a Tabela 5.2 ou
  `ajustarDosePorPRNT` — a discussão inteira é sobre **quando** cada uma é
  chamada e **quais campos são pedidos**, não sobre os números das fórmulas.

---

## 5. Recomendação (sem implementar nada ainda)

1. **Confirmar com a orientadora qual leitura vale para o item 2** — (a)
   cosmética ou (b) literal. Pelo exemplo do C3 acima, a leitura (b) tem
   risco agronômico real e concreto; a (a) já é essencialmente o
   comportamento atual.
2. **Para o item 1**, decidir se a pergunta "Primeira calagem/Reaplicação"
   deve continuar existindo como está (rara, mas presente para abertura de
   área nova) ou se deve ser removida/pré-marcada como "Reaplicação" por
   padrão — nesse caso, os campos extra (`V_atual`, `CTC_pH7`) passam a
   fazer parte do fluxo padrão para a maioria dos usuários da região.
3. Qualquer mudança precisa tocar as **4 cópias da regra** listadas em
   §1.5/§2.4 (backend + 3 pontos no frontend) para não deixar telas
   inconsistentes entre si — em especial `NovaAnalisePage.tsx`, que hoje
   reimplementa o limiar `6.3` sem importar a função compartilhada.
4. Atualizar os cenários **C3, C7 e C9** de
   `docs/plano-testes-validacao-agronoma.md` (e os testes automatizados
   correspondentes) para refletir o novo comportamento esperado, e rodar
   `npm test` antes/depois como baseline — mesma disciplina já usada nas
   correções anteriores documentadas em `docs/00-visao-geral.md`.
