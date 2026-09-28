# Plano de Implementação: Calculadora de Adubação (Grãos)

Este plano detalha a construção do módulo de adubação como um sistema totalmente **independente** da calagem, utilizando tabelas separadas no banco de dados e fluxos apartados, conforme alinhado. 

O trabalho foi dividido em 8 partes sequenciais. Após aprovar este plano, você poderá me pedir: *"Implemente a Parte 1"*, *"Implemente a Parte 2"*, etc.

## Respostas Consolidadas (Premissas Adotadas)
1. **Banco de Dados:** Usaremos tabelas separadas (ex: `analises_adubacao`) para garantir total independência do módulo de calagem.
2. **Cevada:** O campo `finalidade_cevada` será adicionado para controlar a trava de nitrogênio no malte tipo único.
3. **3º Cultivo:** O front-end exibirá opções `['1º', '2º', '3º ou mais']`, onde o "3º ou mais" será processado sob o capô como "1º cultivo".
4. **Independência de pH:** Como a adubação é independente, o campo `pH_agua` será incluído no formulário de adubação (pois é vital para o alerta de Mo na soja).
5. **Prisma Legado:** O diretório `backend/backend` contendo o `prismaClient.ts` será deletado.

---

## 🚀 SEQUÊNCIA DE IMPLEMENTAÇÃO

### Parte 1: Limpeza Legada e Banco de Dados (Drizzle)
**Objetivo:** Preparar a fundação do banco de dados para a nova entidade independente.
*   **Ação:** Excluir a pasta legada `backend/backend` (que continha o Prisma).
*   **Criar/Modificar:** `backend/src/database/schema.ts`
    *   Criar Enums do banco para adubação: `culturas`, `metodos_extratores`, `sistema_cultivo`, `tipo_correcao`.
    *   Criar a tabela `analises_adubacao` contendo todas as variáveis químicas brutas (P, K, S, Cu, Zn, B, Mn, pH) e dados de manejo, além de um campo JSON para armazenar o resultado processado.
*   **Ação:** Gerar a migration do Drizzle e criar o DAO `backend/src/database/adubacao.ts` (CRUD básico).

### Parte 2: Dicionários e Tabelas Estáticas de Agronomia
**Objetivo:** Traduzir as tabelas do manual da ROLAS-RS/SC (Seção 3) para TypeScript.
*   **Criar:** `backend/src/services/tabelasAdubacaoGraos.ts`
    *   Tabelas de Classificação (TAB-01A, 01B, 01C, TAB-03A, 03B).
    *   Tabelas de Interpretação (TAB-02P, TAB-02K).
    *   Tabelas de Recomendação (TAB-04 a TAB-07) contendo as regras de N, P, K, estádios de aplicação e extração de nutrientes.

### Parte 3: Zod Schema de Validação
**Objetivo:** Garantir a consistência dos dados de entrada antes do cálculo.
*   **Criar:** `backend/src/schemas/adubacaoSchema.ts`
    *   Definir os tipos TypeScript (`EntradaAdubacao`).
    *   Implementar a validação com `zod`, contendo os refinamentos condicionais (ex: S obrigatório para canola/soja; bloqueio de Adubação Total em argila < 20% ou CTC < 7,5).

### Parte 4: Motor de Cálculo Agronômico (Core)
**Objetivo:** Implementar as fórmulas descritas na Seção 4.
*   **Criar:** `backend/src/services/calculadoraAdubacao.ts` (Funções puras: ex. conversão Mehlich-3 para Mehlich-1).
*   **Criar:** `backend/src/services/motorAdubacao.ts` (O cérebro: orquestra a entrada, consulta as tabelas estáticas, aplica as regras de Nitrogênio/Fósforo/Potássio, faz parcelamento e retorna o JSON estruturado).
*   **Criar:** `backend/src/services/warningsAdubacao.ts` (Lógica dinâmica de geração de alertas para toxidez, pH, S, Micronutrientes).

### Parte 5: Rotas de API e Testes Unitários
**Objetivo:** Expor o motor e validar sua precisão.
*   **Modificar:** `backend/src/routes/analisesRoutes.ts` ou criar `adubacaoRoutes.ts` (Endpoints POST/GET para salvar e listar `analises_adubacao`).
*   **Criar:** `backend/src/utils/adubacao.test.ts` (Testar o motor de cálculo com no mínimo 3 cenários extremos, ex: Soja sem N; Milho com alta densidade; Solo arenoso e K elevado).

### Parte 6: Adaptação Frontend (Schemas e Rotas)
**Objetivo:** Preparar a base do front para as novas telas.
*   **Sincronizar:** Copiar/exportar os schemas e tipos de Adubação para uso no React.
*   **Modificar:** `frontend/src/services/api.ts` (Adicionar endpoints da adubação).
*   **Configurar:** Preparar a infraestrutura de rotas no front-end para exibir o módulo independente.

### Parte 7: Tela de Formulário Dinâmico (React)
**Objetivo:** Criar a interface de input respeitando as lógicas de exibição.
*   **Criar:** `frontend/src/pages/NovaAdubacaoPage.tsx`
    *   Formulário segmentado usando React Hook Form + `useWatch`.
    *   Implementar dinamicamente os tooltips e campos (ex: seção de micronutrientes colapsável, campo "Cultura Antecedente" apenas para gramíneas, dropdown de "Finalidade da Cevada").

### Parte 8: Relatório de Resultados e Impressão (PDF)
**Objetivo:** Renderizar o JSON do cálculo para o usuário final.
*   **Criar/Modificar:** `frontend/src/pages/AdubacaoDetalhesPage.tsx` (Tela que exibe os Blocos 1 a 5, separando as tabelas de N, P, K e os avisos de manejo).
*   **Modificar:** `frontend/src/services/pdfGenerator.ts` (Criar o template de impressão profissional com as diretrizes do novo módulo).

---

## User Review Required

Nesta fase de planejamento, **nenhum arquivo de código foi modificado ou criado no seu repositório**. 
O plano acima está finalizado com todas as suas diretrizes. 

Você pode revisá-lo através desta aba lateral. Se tudo estiver correto, **por favor, clique no botão "Proceed"** abaixo. Logo em seguida no chat, você poderá pedir: *"Implemente a Parte 1"*, e avançaremos incrementalmente!
