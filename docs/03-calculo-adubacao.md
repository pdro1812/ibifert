# Etapa 3 — Motor de Cálculo: Adubação

Escopo lido: `backend/src/services/motorAdubacao.ts`,
`backend/src/services/calculadoraAdubacao.ts`,
`backend/src/services/tabelasAdubacaoGraos.ts`,
`backend/src/services/warningsAdubacao.ts`,
`backend/src/services/motorStandalone.ts`,
`backend/src/routes/standaloneRoutes.ts`,
`backend/src/schemas/adubacaoSchema.ts`,
`backend/src/utils/adubacao.test.ts`, `backend/src/database/adubacao.ts`, e
comparação cruzada com `docs_antigos/adubacao.md`,
`docs_antigos/auditoria_adubacao.html`,
`docs_antigos/analise_arquitetura_adubacao.md` e
`docs_antigos/plano_implementacao_adubacao.md`.

> Fase de leitura — mas, diferente das etapas anteriores, aqui eu **rodei
> os testes e escrevi scripts de comparação pontuais** (não alterei
> nenhum arquivo do projeto) para verificar hipóteses de divergência antes
> de reportá-las — lição da Etapa 2, onde uma leitura sem rodar teste
> deixou passar um bug real.

---

## 1. Dados de entrada (`AdubacaoSchema`)

**Grupo A — Solo** (obrigatórios): `argila` (0–99%), `MO` (matéria
orgânica, >0–20%), `CTC_pH7`, `P` + `metodo_P` (Mehlich-1/3), `K` +
`metodo_K`, `Ca`, `Mg`. Opcionais: `S`, `Cu`, `Zn`, `B`, `Mn`, `pH_agua`.

**Grupo B — Cultura e manejo** (obrigatórios): `cultura` (16 opções),
`num_cultivo` (1º ou 2º cultivo do ano), `rendimento_esperado`,
`sistema_cultivo`, `tipo_correcao` (Gradual/Total, default Gradual).
Condicionais via `.refine()`:
- `S` obrigatório para soja/ervilha/ervilhaca/canola/nabo_forrageiro.
- `cultura_antecedente` obrigatório para aveias/centeio/cevada/trigo/
  triticale/milho (a MO cruza com a cultura anterior pra definir N base).
- `tipo_correcao = 'Total'` exige `argila >= 20` e `CTC_pH7 >= 7.5`.
- `finalidade_cevada` obrigatória quando `cultura = 'cevada'`.

## 2. Pipeline de cálculo (`executarMotorAdubacao`)

```
entrada validada
  → gerarAlertasDiagnose()               (S, Mo/molibdênio, micros, Ca, Mg)
  → conversão Mehlich-3 → Mehlich-1       (se necessário, P e K)
  → classificação do solo                 (argila, MO, CTC, P, K)
  → cálculo de N                          (base por MO/cultura antecedente + ajuste por produtividade)
  → cálculo de P2O5                       (por classe de disponibilidade + corretiva/manutenção)
  → cálculo de K2O                        (idem P2O5 + limite de 80kg na linha de semeadura)
  → retorno: classificação + doses + alertas
```

### 2.1 Conversão Mehlich-3 → Mehlich-1 (`calculadoraAdubacao.ts`)

```
P_M1 = P_M3 / (2 - 0.02 * argila)
K_M1 = K_M3 * 0.83
```
Só é aplicada se o laboratório informou o extrator Mehlich-3 — a tabela
de classificação (TAB-02P/02K) é calibrada para Mehlich-1. Lança erro se
`argila >= 100` (evita divisão por zero/negativo).

### 2.2 Classificação do solo (`tabelasAdubacaoGraos.ts`)

- **Argila** → 4 classes (TAB-01A): ≤20 / ≤40 / ≤60 / >60 (classe 4→1).
- **MO** → baixo/médio/alto (TAB-01B): ≤2.5 / ≤5.0 / >5.0.
- **CTC** → baixa/média/alta/muito alta (TAB-01C): ≤7.5 / ≤15 / ≤30 / >30.
- **P e K** → 5 níveis (muito_baixo…muito_alto), com faixas que dependem
  da classe de argila (para P) ou de CTC (para K) — tabelas TAB-02P/02K,
  16 faixas no total, todas com valores explícitos no código.

### 2.3 Nitrogênio (N)

- Culturas com fixação biológica (`bnf: true` — soja, ervilha, ervilhaca)
  → `N = 0`, com alerta para inocular rizóbio.
- Demais: dose base por classe de MO (e, quando a cultura exige, cruzada
  com `cultura_antecedente` — Leguminosa/Gramínea/Consorciação-Pousio) na
  `TABELA_N_BASE`. Ajuste por produtividade acima da referência da
  cultura:
  ```
  ajuste = (rendimento_esperado - rend_ref) * fator_adicional_por_tonelada
  ```
  Para aveias/centeio/cevada/trigo/triticale, o fator muda conforme a
  cultura antecedente (20 se Leguminosa, 30 se não) — comentário no código
  já documenta essa nuance (`motorAdubacao.ts:62-66`).
- Milho: soma 10kg N extra a cada 5.000 plantas/ha acima de 65.000.
- Alertas informativos: rendimento >10t/ha (considerar +20-40% a critério
  técnico), cevada cervejeira (não aplicar N após espigamento).

### 2.4 Fósforo (P₂O₅) e Potássio (K₂O)

Mesma estrutura para os dois nutrientes:
- **Classe "muito_alto"**: no 1º cultivo, dose = 0 (com alerta de
  reposição estimada pela exportação da cultura); no 2º cultivo, "reposição
  parcial a critério do técnico" (sem dose numérica — ver achado §7.2).
- **Correção Total** (`tipo_correcao='Total'`, só no 1º cultivo, classes
  muito_baixo/baixo/médio): dose = `TABELA_CORRECAO_TOTAL` (valor fixo por
  classe) + manutenção da cultura + ajuste de produtividade (só se
  positivo).
- **Gradual** (padrão): dose = valor tabelado por cultura/classe/nº de
  cultivo (`TABELA_PK_CULTURA`) + ajuste de produtividade.
- **K₂O**: se a dose total passar de 80 kg/ha, o excedente é destacado
  como "complementar" (cobertura ou a lanço), com alerta explicando o
  porquê — limite de segurança para aplicação na linha de semeadura.

## 3. Alertas de diagnose secundária (`warningsAdubacao.ts`)

Disparados independentemente do cálculo de NPK, a partir dos dados que o
usuário informou (todos opcionais no schema):
- **Enxofre baixo** → recomenda 20kg S-SO4/ha; para soja, sugere trocar
  parte da ureia por sulfato de amônio.
- **Molibdênio** (só soja, pH < 5.5) → risco de eficiência de FBN reduzida.
- **Micronutrientes baixos** (Cu/Zn/B/Mn) → alerta genérico por nutriente.
- **Ca/Mg baixos** → sugere avaliar calagem (liga esse motor de volta ao
  de calagem, mas só como texto — não há integração automática entre os
  dois cálculos).

## 4. `motorStandalone.ts` — engine alternativo, e aqui a coisa aparece grave

> ✅ **Atualização 2026-08-23**: as duas divergências de cálculo abaixo
> (§4.1 e §4.2) **foram corrigidas** em commit `b8d3ccf` (2026-08-21) —
> confirmado lendo o diff e o estado atual de `motorStandalone.ts`. O
> relato original é mantido abaixo como registro do achado; a
> especificação do comportamento atual (já correto) está em
> `docs/ref-adubacao.md` (nota no topo do documento). Também confirmado
> nesta atualização: `motorStandalone.ts` **não é código morto** — é
> chamado por `frontend/src/pages/ValidacaoAgronomicaPage.tsx`, uma
> página interna que roda os dois motores (`motorCalagem` = "Motor
> Original" e `motorStandalone` via `/api/standalone` = "Motor SQL") lado
> a lado para comparação/validação manual. A rota `/validacao` no
> frontend não está protegida por `ProtectedRoute`/role, e a rota de
> backend `/api/standalone/calcular` continua sem autenticação (achado
> 5.4 da Etapa 1) — isso segue válido como exposição pública, independente
> da correção de cálculo já aplicada.

Esse arquivo (parte do escopo desta etapa por já ter sido identificado na
Etapa 1 como rota pública) **não é sobre adubação** — é uma **segunda
implementação, independente, do cálculo de calagem**, que reusa
`tabelaSmpLookup` mas reimplementa toda a lógica de decisão do zero, sem
compartilhar código com `motorCalagem.ts`. Isso por si só já seria motivo
de atenção (mesma regra de negócio em dois lugares = duas chances de
divergir). Testei empiricamente comparando as duas engines com a mesma
entrada, e **elas divergem em dois cenários concretos**:

### 4.1 CONFIRMADO — recomendação oposta em PD Consolidado com restrição

Input: `pH_10_20 = 5.6`, `Al_sat_10_20 = 35%`, `SMP_10_20 = 5.0`.

| Engine | Resultado |
|---|---|
| `motorCalagem.ts` (`executarMotorCalagem`, PD_COM_RESTRICAO) | `aplicar_calcario: false`, `NC_final: 0` |
| `motorStandalone.ts` (`obtemDoseDiretoConsolidadoComRestricao`) | **"aplicar 9.900 t/ha de calcário, modo Incorporado"** |

Causa: o motor principal decide aplicar calcário quando
`pH < 5.5 AND Al_sat >= 30%` (ou seja, não aplica se **qualquer** uma das
duas condições falhar). O standalone decide **não** aplicar só quando
`pH >= 5.5 AND Al_sat <= 30%` (as duas ao mesmo tempo) — uma lógica
diferente (AND em vez de OR na condição de dispensa), que faz o
standalone recomendar calagem em casos onde o motor principal diz que não
é necessário. Reproduzido rodando as duas funções lado a lado com o
mesmo input (não é leitura de código, é execução real).

### 4.2 CONFIRMADO — trava de segurança de 5 t/ha ausente no standalone

Input equivalente ao teste `CT-05` do motor principal (PD Consolidado,
SMP=4.4, condições que geram dose calculada de 5.25 t/ha antes do limite):

| Engine | Resultado |
|---|---|
| `motorCalagem.ts` | `NC_final: 5.0` + alerta "excede limite de 5 t/ha para aplicação superficial" |
| `motorStandalone.ts` (`obtemDoseDiretoConsolidadoSemRestricao`) | **"aplicar 5.250 t/ha, modo Superficial"** — sem trava, sem alerta |

O limite de 5 t/ha para aplicação superficial no PD Consolidado é uma
recomendação de segurança agronômica do manual (dose maior que isso em
superfície não é eficaz/seguro, precisa reaplicação parcelada) — o
standalone simplesmente não implementa essa trava.

### 4.3 Por que isso é grave

`standaloneRoutes.ts` (`POST /api/standalone/calcular`) está **sem
autenticação e sem validação de schema** (achado 5.4 da Etapa 1) — ou
seja, é a rota mais exposta do sistema, e é também a que carrega a lógica
de cálculo mais desatualizada/divergente. Qualquer consumidor externo
dessa rota (se ela for usada por algum integrador, embed, ou app
separado) está recebendo recomendações de calagem que contradizem
diretamente o motor "oficial" usado no restante da aplicação.

**Recomendação (não aplicada agora, decisão sua):** definir se
`motorStandalone.ts` ainda tem uso real. Se sim, a correção correta não é
"patchar" as duas condições — é **fazer a rota standalone chamar
`motorCalagem.ts`** (ou as funções de `calculadoraCalagem.ts`) em vez de
manter uma segunda implementação paralela, eliminando a possibilidade de
divergência futura. Se não tem mais uso, é candidato a remoção completa
(arquivo + rota).

## 5. Achados — camada de adubação propriamente dita

### 5.1 MÉDIO — cobertura de teste muito abaixo da calagem

`adubacao.test.ts` tem só **2 casos** (contra 20 do motor de calagem):
um cenário "manutenção, P/K altos" e um "correção total, solo muito
pobre". Ambos passam. Não há teste cobrindo: 2º cultivo (`num_cultivo:
'2'`), classe "muito_alto" de P/K (dose zero + reposição), fixação
biológica de N (soja passa perto mas não afirma o valor de P/K), o limite
de 80kg de K na semeadura, nem o roteamento por cultura antecedente para
gramíneas de inverno. Dado que essa é a camada mais extensa (16 culturas,
tabelas grandes), a cobertura atual não dá confiança equivalente à da
calagem.

### 5.2 BAIXO/MÉDIO — "reposição parcial" no 2º cultivo não tem valor numérico

Quando P ou K estão em classe `muito_alto` e é o 2º cultivo do ano,
`tipoP2O5`/`tipoK2O` vira o texto `"Reposição parcial — a critério do
técnico"`, mas `doseP2O5`/`doseK2O` **continua em 0** (nunca foi atribuído
nesse branch — `motorAdubacao.ts:102-104` e `130-133`, comparar com o
branch do 1º cultivo que ao menos calcula a `reposicao` estimada, ainda
que só para alerta). Resultado prático: o PDF/relatório final mostra "0
kg/ha" com o texto "reposição parcial a critério do técnico" — ambíguo
para quem vai aplicar, porque não fica claro se é literalmente zero ou se
falta um número que o técnico precisa decidir à parte. Vale confirmar com
você/agronomia se isso é o comportamento pretendido antes de mexer.

### 5.3 Gap conhecido, ainda aberto — fracionamento de N (Semeadura x Cobertura)

A auditoria anterior (`docs_antigos/auditoria_adubacao.html`, achado
"Fracionamento e Cronograma de N") já apontava que a Tabela 3.7 do manual
(cronograma de aplicação de N fracionado entre semeadura e cobertura) não
existe no código — o motor entrega só a dose total de N. **Confirmado
que continua assim**: `tabelasAdubacaoGraos.ts` não tem nenhuma tabela de
cronograma, e `motorAdubacao.ts` retorna só
`{ dose_total_kg_ha, tipo }` para N (compare com K₂O, que **já tem**
esse fracionamento — semeadura/cobertura). Não é um bug introduzido
agora, é uma lacuna de escopo que segue pendente desde a auditoria
anterior.

### 5.4 BAIXO — `packages/shared-schemas` confirmado como pacote morto

Testei diretamente: **nenhum arquivo em `backend/src` ou `frontend/src`
importa de `shared-schemas`** (grep vazio), e nenhum `package.json` do
monorepo declara a dependência entre si. Além de não ser usado, o schema
de adubação em `packages/shared-schemas/src/adubacaoSchema.ts` já
**divergiu** do schema real em uso
(`backend/src/schemas/adubacaoSchema.ts`): o pacote compartilhado tem uma
validação extra em `identificacao` (`trim()` + máximo de 120 caracteres)
que o schema realmente usado não tem. Isso reforça o que eu tinha
levantado como suspeita na Etapa 1 — é código morto hoje, mas também é a
prova de que "ter um pacote compartilhado" só ajuda se ele for
efetivamente importado; do jeito que está, ele é só mais um lugar pra
manter (e já ficou desatualizado). Candidato a remoção total do pacote —
ou, alternativamente, adotar ele de verdade e apagar as cópias locais
(decisão maior de arquitetura, não faço sozinho).

### 5.5 Nenhuma modelagem de segurança nova aqui

Como na Etapa 2, `motorAdubacao.ts`/`calculadoraAdubacao.ts`/
`tabelasAdubacaoGraos.ts`/`warningsAdubacao.ts` são código puro — os
riscos de segurança já mapeados (rota pública, IDOR em `GET /:id`) foram
tratados na Etapa 1.

## 6. O que é salvo no banco

Tabela `analisesAdubacao`: grava todo o Grupo A e Grupo B da entrada, mais
`recomendacao_json` — o **resultado inteiro** do motor (classificação +
doses + alertas) serializado como JSONB. Igual à calagem, isso torna o
histórico auto-suficiente (reproduzível sem depender do motor atual),
mas também significa que os dois bugs de `motorStandalone` (§4.1, §4.2)
não afetam registros salvos via o fluxo normal (`/api/adubacao/*`) — só
afetam quem usa `/api/standalone/calcular` diretamente (rota que, aliás,
nem salva nada no banco — só retorna o cálculo).

## 7. Resumo de prioridade (adiciona à lista da Etapa 1)

1. **§4.1 e §4.2** — ✅ divergência de cálculo corrigida (commit
   `b8d3ccf`, 2026-08-21). **Continua aberto**: a rota
   `/api/standalone/calcular` segue **pública e sem autenticação**, e
   `motorStandalone.ts` continua sendo uma segunda implementação
   duplicada (não chama `motorCalagem.ts`) — risco de divergência futura
   permanece mesmo com o bug atual corrigido. Uso real confirmado:
   `ValidacaoAgronomicaPage.tsx` (ferramenta interna de comparação).
2. **Etapa 2, §6.0** (bug do `pH_agua >= 5.5` inalcançável) — ✅ corrigido
   em 2026-08-22 (commit `7ae0c50`), `npm test` 20/20.
3. **§5.1** — ampliar cobertura de teste do motor de adubação antes de
   qualquer refatoração nele (a calagem já tinha essa rede de segurança
   quando o bug foi achado; a adubação ainda não tem).
4. **§5.4** — decidir o destino de `packages/shared-schemas` (remover ou
   adotar de verdade).
5. **§5.2 e §5.3** — validar com você/time agronômico se são lacunas reais
   de produto ou comportamento aceito.

## Próximo passo

Seguir para a **Etapa 4 — CRUDs de Apoio (Análises e Fazendas)**, que já
tem 3 achados de IDOR pré-identificados na Etapa 1 (§5.2/5.3) para
aprofundar.
