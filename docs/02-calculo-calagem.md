# Etapa 2 — Motor de Cálculo: Calagem

Escopo lido: `backend/src/services/calculadoraCalagem.ts`,
`backend/src/services/motorCalagem.ts`, `backend/src/services/tabelaSmp.ts`,
`backend/src/services/warnings.ts`, `backend/src/schemas/calagemSchema.ts`,
`backend/src/utils/calagem.test.ts`, `backend/src/database/analises.ts`, e
comparação cruzada com `docs_antigos/regras_calagem_graos_v2.md` (spec da
regra de negócio original) e o Manual de Calagem e Adubação RS/SC 2016.

> Fase de leitura — nenhum código alterado.

---

## 1. Dados de entrada (`CalagemSchema`)

Campo obrigatório sempre: `sistema_manejo`, `primeira_calagem`, `pH_agua`
(3.5–8.0), `SMP`, `PRNT` (>0–100).

Campos condicionais (validados via `.superRefine`, não só tipagem — a
obrigatoriedade muda de acordo com outras respostas):

| Condição | Campos extra exigidos |
|---|---|
| `SMP > 6.3` (roteia para método Polinomial) | `MO`, `Al_trocavel` |
| Reaplicação (`primeira_calagem = false`) + método SMP | `V_atual`, `CTC_pH7` |
| `sistema_manejo = PD_CONSOLIDADO` e `pH_agua < 5.5` | `Al_sat` **ou** (`Al_trocavel` + `CTC_pH7`) |
| `sistema_manejo = PD_COM_RESTRICAO` | `SMP_10_20`, `Al_sat_10_20` (direto ou via `monitoramento`) |

Isso replica a lógica de formulário dinâmico do manual: o técnico só
precisa preencher os campos relevantes para o caso dele. A mesma regra de
"quais campos pedir" é reexposta pelo backend via
`determinarCamposNecessarios()` — usada pelo frontend para saber quais
inputs mostrar antes mesmo de validar contra o zod.

## 2. Roteamento do método de cálculo

`rotearMetodoCalagem(SMP)`:
- `SMP > 6.3` → método **Polinomial** (`calcularNCPolinomial6_0`).
- `SMP <= 6.3` → método **SMP** (lookup na `tabelaSmp.ts`, Tabela 5.2 do
  manual RS/SC).

## 3. Fórmulas

### 3.1 Método Polinomial (SMP > 6.3, pH-alvo 6.0)

```
NC_pol_6.0 = -0.516 + 0.805 * MO + 2.435 * Al_trocavel
```
Resultado nunca é negativo (`Math.max(0, nc)`).
Conferido contra `docs_antigos/regras_calagem_graos_v2.md:337` — mesma
fórmula, mesmos coeficientes.

### 3.2 Método SMP (SMP <= 6.3)

Lookup direto na Tabela 5.2 do manual (`tabelaSmp.ts`), sem interpolação:
- Usa `floor` do SMP para 1 casa decimal (ex.: 5.85 → 5.8).
- `SMP < 4.4` → usa a linha 4.4 (limite superior de dose da tabela).
- `SMP > 7.1` → `NC_base = 0`.
- pH-alvo sempre 6.0 nesse motor (colunas 5.5/6.5 existem na tabela mas
  não são usadas em nenhum ponto do `motorCalagem.ts` — ver achado de
  código morto parcial em §6).

### 3.3 Saturação por Bases — NC_vb (reaplicação, método SMP)

Calculada **em paralelo** ao NC_base quando é reaplicação (`primeira_calagem
= false`) e o método é SMP — serve como segunda referência que o técnico
compara com o resultado do SMP (por isso o resultado carrega os dois:
`NC_smp` e `NC_vb`, mais uma `nota_tecnica` avisando que "a escolha do
método é decisão do técnico").

```
V_desejada = 75%
  se CTC_pH7 < 7.5  → V_desejada -= 5   (70%)
  se CTC_pH7 > 15.0 → V_desejada += 5   (80%)

NC_vb = ((V_desejada - V_atual) / 100) * CTC_pH7      (mínimo 0)
```

### 3.4 Fator de manejo e trava por sistema

| `sistema_manejo` | Fator aplicado | Modo de aplicação | Trava extra |
|---|---|---|---|
| `CONVENCIONAL` | 1.0 | Incorporado, 20cm | — |
| `PD_IMPLANTACAO` | 1.0 (ou 0.5 se opção superficial em campo natural + SMP>5.5) | Incorporado 20cm, ou Superficial | — |
| `PD_CONSOLIDADO` | 0.25 | Superficial | **Máximo 5 t/ha** — acima disso, trava em 5.0 e emite alerta `MSG_LIMITE_SUPERFICIAL_PD` |
| `PD_COM_RESTRICAO` | 1.0 | Incorporado 20cm | Sempre define `acao_requerida = REINICIAR_PLANTIO_DIRETO` |

### 3.5 Ajuste final por PRNT

```
NC_ajustada = NC_final * (100 / PRNT)
```
`PRNT` fora de `(0, 100]` lança erro de validação (`CalagemValidationError`).

## 4. Travas de "não aplicar calcário" (retorno antecipado)

O motor sai cedo com `aplicar_calcario: false` em quatro situações,
cada uma com sua própria mensagem (`warnings.ts`):

1. **CONVENCIONAL/PD_IMPLANTACAO** com `pH_agua >= 5.5` →
   `MSG_SEM_NECESSIDADE_CALAGEM`.
2. **PD_CONSOLIDADO** com `pH_agua >= 5.5` → mesma mensagem.
3. **PD_CONSOLIDADO** com `pH_agua < 5.5` mas `V_atual >= 65%` e
   `Al_sat < 10%` (solo "tamponado") → `MSG_TRAVA_PD_CONSOLIDADO` — essa é
   a regra mais sutil do motor: mesmo com pH baixo, se saturação de bases
   já está boa e alumínio baixo, não recomenda calagem.
4. **PD_COM_RESTRICAO** quando os critérios de restrição (pH<5.5 na
   camada 10-20 E Al_sat_10_20 >= 30%) não se confirmam →
   `MSG_SEM_REINICIO_PD`.

## 5. Fluxo `PD_COM_RESTRICAO` (avaliação de monitoramento 10-20cm)

`avaliarMonitoramento10_20()` é uma etapa **anterior** ao cálculo principal
— avalia se um talhão em `PD_CONSOLIDADO` deve ser rebaixado para
`PD_COM_RESTRICAO` com base em dados da camada 10-20cm:

```
restricao = Al_sat_10_20 >= 30% E (
  produtividade_abaixo_media OU
  compactacao_restringindo_raiz OU
  disponibilidade_P_10_20_abaixo_critico
)
```

Se `restricao = true`, o sistema de manejo efetivo muda para
`PD_COM_RESTRICAO` e passa a exigir `SMP_10_20` — o cálculo então usa a
**média** de SMP das duas camadas (`SMP_0_10` e `SMP_10_20`) em vez do SMP
de superfície isolado (`motorCalagem.ts:154-158`).

Importante: `PD_COM_RESTRICAO` é um **estado interno do motor**, nunca um
valor de entrada do usuário — o formulário só oferece `CONVENCIONAL`,
`PD_IMPLANTACAO`, `PD_CONSOLIDADO`. `database/analises.ts:31-33` já trata
isso corretamente, convertendo de volta para `PD_CONSOLIDADO` antes de
salvar (o enum do banco também não tem `PD_COM_RESTRICAO` como opção válida
de `sistema_manejo` — só existe no enum `sistemasEfetivosEnum`, que por sua
vez **não é usado em nenhuma coluna da tabela `analises`** — ver achado
em §6).

## 6. Achados desta etapa

> **Correção em relação à primeira leitura**: eu tinha registrado aqui que
> não havia divergência entre código e spec. Rodei a suíte de testes só
> depois, já na Etapa 3, e ela **não passa** — 19/20. O motivo é o achado
> 6.0 abaixo, uma trava agronômica que nunca dispara. Fica registrado como
> lição: a partir de agora rodo `npm test` no início de cada etapa que
> toca em código de cálculo, antes de dar qualquer camada por validada.

### 6.0 CRÍTICO (bug confirmado, motor recomenda calagem quando não deveria) — ✅ CORRIGIDO em 2026-08-22 (commit `7ae0c50`)

> Ver estado atual (já corrigido) descrito em `docs/ref-calagem.md §6`.
> O relato abaixo é mantido como registro histórico do achado original.

`backend/src/services/motorCalagem.ts:113-128` — a trava
"PD_CONSOLIDADO com solo tamponado" (pH baixo, mas Saturação por Bases
≥65% e Saturação por Alumínio <10% → não precisa calagem) está escrita
assim:

```ts
if (pH_agua >= 5.5) {
  return criarResultadoNaoAplicar({ ...MSG_SEM_NECESSIDADE_CALAGEM... });
}

const Al_sat_resolvido = resolverAlSat(entrada);

if (
  pH_agua >= 5.5 && entrada.V_atual !== undefined &&   // <-- nunca é true aqui
  entrada.V_atual >= 65.0 &&
  Al_sat_resolvido !== undefined &&
  Al_sat_resolvido < 10.0
) {
  return criarResultadoNaoAplicar({ ...MSG_TRAVA_PD_CONSOLIDADO... });
}
```

O primeiro `if` já retorna sempre que `pH_agua >= 5.5`. Logo, o segundo
`if` só é avaliado quando `pH_agua < 5.5` — e sua própria condição exige
`pH_agua >= 5.5`. É logicamente impossível essa condição ser verdadeira:
**a trava nunca dispara**, em nenhum cenário. O texto da própria mensagem
(`MSG_TRAVA_PD_CONSOLIDADO`, `warnings.ts:4-5`) começa com "Embora o pH em
água esteja **abaixo** de 5,5..." — confirma que a intenção era
`pH_agua < 5.5`, não `>= 5.5`. A spec original também confirma
(`docs_antigos/regras_calagem_graos_v2.md:604`,
`TRAVA-03 | PD Consolidado: não aplicar se V>=65% e Al_sat<10%` — sem
exigir pH>=5.5).

**Efeito prático**: para um talhão em Plantio Direto Consolidado com pH
baixo mas solo já tamponado (V alto, Al baixo — situação em que o manual
diz que calagem não é necessária), o sistema hoje **calcula e recomenda
uma dose de calcário mesmo assim**. Confirmado rodando a suíte:

```
$ npm test
✖ CT-06: Trava de não-aplicação — V% e Al_sat no PD Consolidado
  AssertionError: true !== false
```

19 de 20 testes passam — só esse cenário está quebrado, mas é exatamente o
cenário mais sutil e mais fácil de um técnico não perceber manualmente
(dose calculada plausível, só que desnecessária).

**Correção aplicada em `7ae0c50` (2026-08-22):** removida a checagem
redundante de `pH_agua >= 5.5` do segundo `if` (já era sempre verdadeira
por construção nesse ponto do fluxo). `npm test` confirma 20/20 (CT-06
passou a passar; nenhum outro teste mudou de resultado).

### 6.1 Qualidade — cobertura de teste é boa, mas não bastava só ler

`calagem.test.ts` tem 20 casos, cobrindo: lookup de tabela (limites
inferior/superior), os 4 sistemas de manejo, as 4 travas de não-aplicação,
roteamento SMP↔Polinomial (inclusive o limite exato 6.3), ajuste PRNT,
validação de pH/PRNT fora de faixa, e o fluxo de monitoramento 10-20cm.
A cobertura de cenários é boa — o problema em 6.0 não é falta de teste
(o teste existe e é correto), é que o teste está falhando e isso não
tinha sido percebido antes.

**Lacuna de cobertura**: não há teste para `PD_IMPLANTACAO` sem a opção
superficial (fluxo padrão incorporado), nem para o caso `SMP < 4.4`
(clamp no piso da tabela) dentro do `motorCalagem.ts` (só testado
diretamente em `tabelaSmpLookup`, não via `executarMotorCalagem`).

### 6.2 BAIXO — colunas de pH-alvo 5.5/6.5 da tabela SMP nunca são usadas

`tabelaSmpLookup` aceita `PHAlvo` de `5.5 | 6.0 | 6.5`, mas
`motorCalagem.ts` só chama com `6.0` (as 2 ocorrências, linhas 166 e 192).
Não é código morto no sentido de "arquivo não usado" — a função e a tabela
inteira estão em uso — mas 2/3 dos dados da tabela (colunas `pH_5_5` e
`pH_6_5`) nunca são lidos por nenhum caminho do sistema hoje. Vale
confirmar se isso é intencional (pH-alvo 6.0 é o padrão do manual para
grãos) ou se falta expor a opção de pH-alvo na interface.

### 6.3 BAIXO — enum `sistemasEfetivosEnum` sem uso

`database/schema.ts:55-60` define `sistemasEfetivosEnum` com os 4 valores
incluindo `PD_COM_RESTRICAO`, mas nenhuma coluna da tabela `analises` usa
esse enum — a coluna real (`sistema_manejo`) usa `sistemasManejoEnum` (só
3 valores, sem `PD_COM_RESTRICAO`, coerente com §5 acima). O enum
`sistemasEfetivosEnum` parece ter sido criado para um propósito (talvez
uma coluna "sistema efetivo pós-avaliação" planejada e não implementada)
e ficou órfão. Candidato a remoção, a confirmar quando eu chegar à
Etapa 4/7 e olhar o resto do schema em uso.

### 6.4 BAIXO — `Monitoramento10_20Schema` validado mas não persistido em `PD_COM_RESTRICAO` puro

Os campos de monitoramento (`monitoramento_ativo`,
`monitoramento_pH_agua_10_20` etc.) são salvos em `analises.ts`, mas
`SMP_10_20` só é populado quando ele veio no payload — no fluxo
`PD_COM_RESTRICAO` direto (usuário já sabe que está em restrição e manda
`SMP_10_20` direto, sem passar pelo objeto `monitoramento`), os campos
`monitoramento_*` ficam `null`, o que é esperado, só registrando que o
rastro salvo no banco não deixa claro *por que* o sistema virou
`PD_COM_RESTRICAO` nesse caso (não dá pra saber depois, só olhando o
banco, se foi avaliação automática via `avaliarMonitoramento10_20` ou
input direto do usuário). Não é bug, é uma observação de rastreabilidade.

### 6.5 Nenhum achado de segurança nesta camada

Este módulo é puro (funções determinísticas, sem I/O, sem acesso a request/
response) — a superfície de risco já foi coberta na Etapa 1 (quem pode
chamar a rota, o que é salvo e pra quem).

## 7. O que é salvo no banco

Tabela `analises` (ver schema completo na Etapa 1) — grava entrada bruta
(pH, SMP, MO, Al_trocavel, V_atual, CTC_pH7, Al_sat, dados de
monitoramento 10-20) **e** todo o resultado calculado (NC_base, NC_final,
NC_ajustada, NC_vb, método roteado, modo de aplicação, profundidade,
alertas). Ou seja, o histórico é auto-suficiente: dá pra auditar/reproduzir
o cálculo de uma análise antiga sem depender do motor atual.

## Próximo passo

Seguir para a **Etapa 3 — Motor de Cálculo: Adubação**, escopo maior e com
auditoria legada já disponível para cruzamento
(`docs_antigos/auditoria_adubacao.html`).
