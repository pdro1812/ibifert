# Análise Arquitetural e Plano de Implementação: Módulo de Adubação

## 1. Análise de Fluxo Existente (Módulo de Calagem)

O sistema atual implementa o fluxo de calagem utilizando uma arquitetura moderna e bem estruturada, dividida nas seguintes camadas:

*   **Front-end (React + TypeScript):**
    *   Utiliza formulários dinâmicos com validação rigorosa para guiar o usuário na entrada de parâmetros de solo.
    *   Páginas dedicadas (ex: `CalculadoraPage.tsx`) gerenciam o estado (React hooks) e se comunicam com a API via chamadas HTTP.
    *   Dashboards (ex: `AdminDashboardPage.tsx`) consomem endpoints que agregam os dados para visualização de métricas regionais, históricas e de usuários.
*   **Back-end (Node.js + Express + TypeScript):**
    *   **Roteamento e Controladores:** Rotas delimitadas (`analisesRoutes.ts`) delegam requisições aos controladores adequados.
    *   **Validação (Zod):** Esquemas rígidos (como visto em `calagemSchema.ts`) garantem a integridade da entrada (ex: regras para limites numéricos e condicionais dependentes do Método SMP, CTC e Planta de Cobertura) antes do processamento.
    *   **Motor de Regras (Service Layer):** A lógica agronômica complexa é devidamente isolada (ex: `motorAdubacao.ts`, alertas específicos) e extensamente testada, desacoplando regras da infraestrutura web.
    *   **ORM e Banco de Dados (Drizzle ORM + PostgreSQL):** A persistência é type-safe. A entidade `analises` consolida os parâmetros calcários e vincula-se com `users` e `talhoes`.

---

## 2. Decisão Arquitetural (Modelagem de Dados)

Ao expandir a aplicação para calcular e armazenar dados de **Adubação**, avaliar a modelagem do banco é o ponto crítico. Considerando o cenário atual, temos duas opções:

1. **Unificada (Tudo em `analises`):** Adicionar campos como Argila, Fósforo, Potássio e Culturas na tabela existente.
2. **Separada:** Criar uma nova tabela (ex: `analises_adubacao`) apenas para esse contexto.

### **Decisão: Tabelas Separadas (`analises` e `analises_adubacao`)**

**Justificativa:**
A separação física (tabelas distintas) é a abordagem mais sólida e já se alinha à evolução da base de código. Os principais motivos são:

1.  **Diferença de Domínio (Separation of Concerns):**
    *   **Calagem:** Focada em correção de acidez (pH, SMP, MO, Al_trocavel, SAT, PRNT).
    *   **Adubação:** Focada na exigência nutricional por cultura e balanço de massa (Extração de P, K, Ca, Mg, Metodologias Mehlich, Expectativa de Rendimento, Culturas e Sistema de Cultivo).
    *   As entradas são substancialmente diferentes e os cálculos são processos quase autônomos.
2.  **Sparsity (Matriz Esparsa) e Desnormalização:**
    *   Fundir os domínios geraria uma megatabela com dezenas de colunas, onde num cálculo exclusivo de adubação, os campos de acidez poderiam ficar ociosos e vice-versa (uso massivo de `NULL`), dificultando validações no nível do banco.
3.  **Dashboards e Agregações Independentes:**
    *   Painéis de calagem buscam métricas como médias de pH e toneladas de calcário/ha necessárias numa região.
    *   Painéis de adubação focarão em níveis médios de N-P-K nos solos e balanço de fertilizantes por cultura plantada. Estruturas separadas permitem índices especializados (`indexes`) no DB, otimizando as consultas massivas do admin.
4.  **JSONB e Extensibilidade:**
    *   O output da Adubação (as recomendações de N, P2O5, K2O) pode variar imensamente dependendo da cultura. Armazenar a saída como `recomendacao_json` num registro focado e isolado, evita conflitos estruturais, mantendo a tabela `analises` enxuta.

*(Nota técnica: A avaliação do arquivo `schema.ts` atual revela que o Drizzle já possui a entidade `analises_adubacao` engatilhada de maneira isolada. Esta análise comprova e referenda que essa decisão foi acertada e deve ser mantida)*.

---

## 3. Plano de Implementação Técnico Passo a Passo

Considerando a adoção arquitetural das tabelas independentes, a entrega da feature deve seguir este roteiro:

### **Fase 1: Infraestrutura de Dados (Drizzle + Postgres)**
1. **Revisão do Schema:** Confirmar se todos os macros e micronutrientes, e relações (FKs para `users` e `talhoes`) em `analisesAdubacao` (no arquivo `schema.ts`) cobrem todos os inputs agronômicos necessários.
2. **Migrations:** Executar a geração (`drizzle-kit generate`) e a sincronização das tabelas no ambiente de desenvolvimento/staging.
3. **Campos Específicos:** Manter o uso do campo `recomendacao_json` para o output do cálculo. Caso métricas do painel precisem de totais numéricos diretos (ex: Soma Total de NPK na safra), extrair essas chaves na raiz da tabela se por performance os índices JSON falharem.

### **Fase 2: Back-end (Express, Zod & Regras Agronômicas)**
1. **Zod Schemas (`backend/src/schemas/adubacaoSchema.ts`):** Criar validações paritárias com a calculadora de calagem.
    *   Limites numéricos realistas (ex: Fósforo (P) > 0).
    *   Lógica condicional via `.superRefine` (ex: Exigir "finalidade" APENAS se a cultura for Cevada).
2. **Camada de Serviço (`motorAdubacao.ts` e `warningsAdubacao.ts`):**
    *   Desenvolver ou plugar os algoritmos oficiais (manuais da região) que cruzam teor no solo + expectativa de produtividade = doses N-P-K (kg/ha).
    *   A geração de alertas (alertas nutricionais, desbalanço Ca:Mg, ou baixa CTC).
3. **Endpoints (`adubacaoRoutes.ts` e Controladores):**
    *   Implementar `POST /api/adubacao` para receber dados, validar no Zod, invocar o motor e salvar na nova tabela `analises_adubacao`.
    *   Implementar GETters para histórico de adubação por usuário/fazenda.
4. **Agregações do Dashboard:** Desenvolver rotas focadas no `AdminDashboardPage` retornando GROUP BYs da tabela `analises_adubacao` (ex: contagem de recomendações por Cultura).

### **Fase 3: Front-end (React + Vite)**
1. **Interface do Formulário (`AdubacaoPage.tsx`):**
    *   Componentizar campos de modo reativo.
    *   Sincronizar a validação usando o mesmo ecossistema Zod para *early feedback* visual.
2. **Exibição do Laudo e Receituário:**
    *   Criar UI de leitura agradável a partir do `recomendacao_json` retornado (tabelas de macronutrientes, fontes como Ureia, MAP, KCl etc.).
3. **Evolução do Admin Dashboard:**
    *   Incluir uma nova aba/widget para reportes nutricionais globais.
    *   Integrar gráficos utilizando dados agregados da nova entidade (rendimentos esperados, mapeamento de fertilidade K/P nas regiões).
