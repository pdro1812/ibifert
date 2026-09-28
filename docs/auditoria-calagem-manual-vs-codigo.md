# Auditoria — Manual (RS/SC 2016) × Implementação de Calagem

> **Status (2026-09-16): achados 1.1 e 1.2 corrigidos**, na branch
> `fix/calagem-manual-vs-codigo` (`backend/src/services/motorCalagem.ts`,
> `backend/src/schemas/calagemSchema.ts`,
> `backend/src/services/calculadoraCalagem.ts`, com testes novos em
> `backend/src/utils/calagem.test.ts` — CT-19 a CT-22). O achado 1.3 era só
> de documentação e foi corrigido direto no `ref-calagem.md`. Este documento
> fica como registro de como os problemas foram encontrados; o comportamento
> **atual** do sistema já reflete as correções descritas abaixo.

**Status original: 2026-09-16.** Comparação linha a linha entre `extracao_claude_calagem.md`
(transcrição independente das p. 65–87 do manual, feita por uma sessão separada
do Claude a partir do PDF, sem acesso ao código) e o comportamento real do
motor de calagem (`backend/src/services/motorCalagem.ts`,
`calculadoraCalagem.ts`, `tabelaSmp.ts`, `schemas/calagemSchema.ts`), com
apoio de `docs/ref-calagem.md` e `docs_antigos/regras_calagem_graos_v2.md`.

**Escopo do sistema:** exclusivamente culturas de grãos (item 5.2.2 / Tabela
5.3 do manual), arroz irrigado excluído — decisão de escopo já documentada em
`docs_antigos/regras_calagem_graos_v2.md:3`. Esta auditoria não cobre
forrageiras, hortaliças, frutíferas/florestais, medicinais ou ornamentais
(itens 5.2.3–5.2.8), porque o sistema não implementa essas culturas.

---

## 1. Achados — divergências reais entre manual e código

### 1.1 `NC_vb` (referência de Saturação por Bases) não recebe o ajuste de dose que o manual manda aplicar — **achado principal**

**O que o manual diz (RN-19, p. 71–72):** o método V% "não houve calibração
para estabelecimento das saturações por bases desejadas... a dose estimada
pela equação corresponde a uma correção da camada de 0 a 20 cm, sendo,
portanto, necessário um ajuste da dose, caso a aplicação seja em superfície
(usar os **mesmos fatores empregados para o SMP**...)".

Ou seja: quando a aplicação é superficial (PD Consolidado, fator ¼; ou PD
Implantação em campo natural, fator ½), o número de Saturação por Bases
também precisaria levar esse fator, do contrário ele não é comparável ao
número calculado pelo SMP.

**O que o código faz:** `NC_vb` é calculado uma única vez, direto do V% bruto,
**sem nunca passar por `fator_manejo`** nem pela trava de 5 t/ha:

```ts
// motorCalagem.ts:170-172
if (calcular_tambem_sat_bases) {
  NC_vb = calcularNCVB(entrada.V_atual!, entrada.CTC_pH7!);
}
```

Compare com o caminho do `NC_smp`, que passa pelo fator de manejo (linha 167)
e, no PD Consolidado, ainda pela trava de 5 t/ha (linhas 199-207) — `NC_vb`
não passa por nenhum dos dois.

**Onde isso aparece para o usuário:** a tela mostra "NC final" e, logo
abaixo, a caixa amarela "Referência — Saturação por Bases", lado a lado, sem
nenhuma ressalva (`CalculadoraPage.tsx:987-992`), exatamente no ponto em que
`MSG_NOTA_REAPLICACAO` diz ao técnico que a escolha entre os dois números é
dele. Num PD Consolidado, o técnico veria `NC_final` já reduzido a ¼ (e
travado em 5 t/ha) ao lado de um `NC_vb` calculado como se a aplicação fosse
incorporada em 0–20 cm — os dois números deixam de ser comparáveis na prática,
e o de Saturação por Bases fica superestimado por um fator de ~4×.

**Impacto prático:** aparece sempre que `calcular_tambem_sat_bases = true`
(o método roteado é SMP — hoje, sempre que `SMP ≤ 6.3`, já que
`primeira_calagem` está fixo em `false`) **e** a dose principal usa um
fator ≠ 1,0 — ou seja, `PD_CONSOLIDADO` (fator ¼) **e também** o caso
especial de `PD_IMPLANTACAO` em campo natural com aplicação superficial
(fator ½, §4.5) — correção a uma imprecisão desta auditoria: `V_atual` e
`CTC_pH7` **são** coletados nesse segundo caso (são obrigatórios sempre que
o método é SMP, independente do `sistema_manejo`), então `NC_vb` também
saía sem o ajuste lá.

**Correção aplicada:** `motorCalagem.ts` agora guarda o fator de ajuste
usado pela dose principal (`fatorAjusteReferenciaVB`, inicializado como
`fator_manejo` e sobrescrito para `0,5` no ramo do campo natural) e
multiplica `NC_vb` por ele antes de devolver o resultado — sem aplicar a
trava de 5 t/ha, que é lida como um teto sobre a dose efetivamente aplicada,
não sobre um número de referência. Testes novos: `CT-19` (fator 0,25 no PD
Consolidado) e `CT-20` (fator 0,5 no campo natural).

**Nota sobre a citação do manual:** o próprio RN-19 cita "Tabelas 5.3 a 5.7
dos itens **5.2.3 a 5.2.8**" — que, lido ao pé da letra, excluiria grãos
(item 5.2.2, Tabela 5.3). Isso está registrado como inconsistência do
próprio manual (`INC-06` na transcrição). Mesmo considerando essa ambiguidade,
o princípio geral (dose superficial precisa do mesmo fator de redução,
qualquer que seja o método) não parece ter razão para não valer para grãos
— sinalizando isso para vocês decidirem, não estou assumindo que é bug óbvio.

---

### 1.2 A trava do PD Consolidado (V% ≥ 65 e Al_sat < 10 → não aplicar) pode nunca ser avaliada quando o método roteado é Polinomial

**O que o manual diz (Tabela 5.3, nota 1 / RN-32):** "Não aplicar quando V ≥
65% e saturação por Al na CTC < 10%" — condição do estado do solo, não do
método usado para calcular a dose.

**O que o código faz:** a trava só dispara se `V_atual` estiver definido:

```ts
// motorCalagem.ts:113-118
if (
  entrada.V_atual !== undefined &&
  entrada.V_atual >= 65.0 &&
  Al_sat_resolvido !== undefined &&
  Al_sat_resolvido < 10.0
) { ... trava ... }
```

E `V_atual` só é **obrigatório** quando o método roteado é SMP — tanto no
schema (`calagemSchema.ts:146-162`, `superRefine`) quanto em
`determinarCamposNecessarios` (`calculadoraCalagem.ts:116-119`):

```ts
if (entrada.primeira_calagem === false && metodo === MetodoCalcRoteado.SMP) {
  adicionar("V_atual", ...);
  adicionar("CTC_pH7", ...);
}
```

**Cenário concreto onde isso importa:** `sistema_manejo = PD_CONSOLIDADO`,
`pH_agua < 5.5`, `SMP > 6.3` (rotea para Polinomial — solo arenoso/pobre em
MO, exatamente o perfil que RN-20 descreve). Nesse caso o formulário não pede
`V_atual`, e mesmo que o solo estivesse tamponado (V alto, Al_sat baixo — a
condição exata que o manual manda bloquear), o sistema segue direto para o
cálculo e recomenda aplicar calcário. A trava simplesmente não tem como
disparar porque a variável que ela depende nunca chega a ser coletada.

**Por que isso é plausível na prática:** SMP > 6,3 em PD Consolidado com pH <
5,5 não é o caso mais comum, mas é exatamente o perfil de solo (baixo poder
tampão) que o próprio manual usa para justificar o roteamento ao método
Polinomial — não é um cenário artificial.

**Observação:** o `frontend/src/schemas/calagemSchema.ts` já exigia
`V_atual` nesse cenário (linhas 131-138 antes desta correção) e a tela
`CalculadoraPage.tsx` (Bloco B2) já coletava o campo independente do
método — então, passando pela tela normal, o dado chegava a ser enviado. O
risco real era o **backend aceitar** um payload sem `V_atual` nesse caso
(chamada direta à API, outro cliente, ou uma futura mudança só no front) e
a trava ficar sem como avaliar.

**Correção aplicada:** `backend/src/schemas/calagemSchema.ts` (validação) e
`backend/src/services/calculadoraCalagem.ts::determinarCamposNecessarios`
agora exigem `V_atual` sempre que `PD_CONSOLIDADO` + `pH_agua < 5.5` (e não
`primeira_calagem`), no mesmo padrão que já existia no schema do frontend —
o backend passa a ser a autoridade final, sem depender do frontend estar
correto. Testes novos: `CT-21` (trava dispara com método Polinomial) e
`CT-22` (backend rejeita payload sem `V_atual` nesse cenário).

---

### 1.3 Lacuna só de documentação (não de código): `ref-calagem.md` não menciona o SMP médio das camadas no reinício do PD

O manual (RN-37, p. 74) manda usar a **média do SMP das camadas 0–10 e
10–20 cm** para a dose de reinício do PD (`PD_COM_RESTRICAO`). Conferido no
código — **está implementado corretamente**:

```ts
// motorCalagem.ts:154-158
const smpParaTabela =
  sistema_manejo === SistemaManejo.PD_COM_RESTRICAO
    ? (SMP_0_10 + (entrada.SMP_10_20 ?? 0.0)) / 2.0
    : SMP;
```

O problema era só que `docs/ref-calagem.md` §3 (fluxo de decisão) não citava
esse detalhe. **Corrigido** — §6 do `ref-calagem.md` agora explica que a
trava 6.3 independe do método roteado, com a referência de código.

---

## 2. Verificado e confere (não são achados — só para registro)

Estes pontos, centrais para o cálculo, foram checados linha a linha contra a
transcrição e batem exatamente:

- **Tabela 5.2** (`tabelaSmp.ts:10-39`) — as 28 linhas × 3 colunas conferem
  com `TAB-02` da transcrição, valor a valor.
- **Fórmula polinomial pH 6,0** (`calcularNCPolinomial6_0`) — coeficientes
  `-0,516 / 0,805 / 2,435` idênticos a `RN-21`.
- **Fator de manejo** — 1,0 (Convencional/PD Implantação/PD com Restrição),
  0,25 (PD Consolidado) — confere com `MET-06`.
- **Limite de 5 t/ha em PD Consolidado** — confere com `TRV-08`.
- **CE-01 (campo natural, PD Implantação superficial)** — gatilho `SMP >
  5,5` e fator ½ conferem exatamente com `motorCalagem.ts:189-196`.
- **Ajuste de V1 por CTC (±5 pp, limites 7,5 e 15,0 estritos)** — confere com
  a leitura estrita já assumida em `LAC-08` da transcrição.
- **Trava PD Consolidado (V≥65% e Al_sat<10%)**, quando `V_atual` está
  disponível — usa a versão imperativa da tabela (não a facultativa do
  texto, `INC-05`), consistente com o resto do sistema ser determinístico.
- **Piso de zero** em NC polinomial e em NC_vb (`Math.max(0, ...)`) — decisão
  razoável para uma lacuna do próprio manual (`LAC-11`).

## 3. Não são achados de código — lacunas do próprio manual, já cobertas por decisão de produto

- `primeira_calagem` sempre `false`/reaplicação: decisão deliberada, já
  registrada em `docs/diagnostico-primeira-calagem-metodo-smp.md`. Torna
  `LAC-13`/`LAC-15` (prioridade entre "primeira calagem→SMP" e "baixo poder
  tampão→Polinomial"; "critério de média" na reaplicação) irrelevantes hoje.
- `LAC-19` (de qual camada vem o SMP usado no ¼ do PD Consolidado): o
  sistema usa o único campo `SMP` coletado, que já corresponde à camada
  correta pedida na tela para cada `sistema_manejo` (0–10 cm para PD
  Consolidado) — interpretação razoável, não há dois campos de SMP para
  confundir.

## 4. O que foi feito (branch `fix/calagem-manual-vs-codigo`)

1. `NC_vb` passou a ser multiplicado pelo mesmo fator usado na dose
   principal (0,25 no PD Consolidado; 0,5 no campo natural de PD
   Implantação) — sem trava de 5 t/ha, por não haver base no manual para
   aplicá-la a um número de referência. Achado §1.1.
2. `V_atual` passou a ser exigido pelo backend sempre que `PD_CONSOLIDADO`
   + `pH_agua < 5.5`, independente do método roteado pelo SMP — alinhando o
   schema do backend ao que o schema do frontend já fazia. Achado §1.2.
3. `docs/ref-calagem.md` (§2, §4.3, §6) atualizado para descrever o
   comportamento corrigido. Achado §1.3.
4. Testes novos em `backend/src/utils/calagem.test.ts`: `CT-19` a `CT-22`.
   Suíte completa (24 testes) e `tsc --noEmit` passando sem erros.

**Em aberto, não decidido nesta correção:** a ressalva do §1.1 sobre a
citação "itens 5.2.3 a 5.2.8" (RN-19) vs. grãos ser o item 5.2.2 — segui a
leitura de que o princípio vale para grãos também, mas é uma leitura, não
algo explícito no manual. Se a equipe achar que não deveria valer para
grãos, é só reverter o fator em `motorCalagem.ts` (variável
`fatorAjusteReferenciaVB`) para `1.0` fixo.
