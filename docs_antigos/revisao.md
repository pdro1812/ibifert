Documentação do Motor de Calagem — IbIFerti (Culturas de Grãos)
1. Como o Sistema Coleta os Dados (Interface Inteligente)
Para não confundir o usuário com campos desnecessários, o aplicativo oculta informações que não são úteis para aquele cenário específico. O sistema oferece dois modos de operação:
Modo Simplificado: Focado na rapidez, utiliza apenas pH e SMP para o cálculo via Tabela e assume que é uma primeira calagem, ocultando campos avançados.
Modo Avançado: Permite o uso total do motor agronômico, incluindo correções para solos específicos (Polinomial, Saturação por Bases, etc).

Campos sempre solicitados (para todos os casos):
Sistema de Manejo (Convencional, Implantação de PD, ou PD Consolidado)
pH em água
Índice SMP
PRNT do Calcário (%)
Identificação (Nome da amostra para o histórico)

Campos solicitados apenas em situações específicas (Modo Avançado):
É a primeira calagem da área? (Sim ou Não): No modo simplificado é sempre "Sim".
Matéria Orgânica (MO) e Alumínio (Al): Só aparecem se o Índice SMP for maior que 6,3. Neste caso, o manual exige o uso da equação polinomial.
Saturação por Alumínio (m%): Só é solicitada no Plantio Direto Consolidado se o pH for menor que 5,5. O produtor pode informar o "m%" direto ou o sistema calcula se ele informar o Alumínio e a CTC.
Saturação por Bases (V%) e CTC: Aparecem em casos de reaplicação ou quando necessários para calcular a saturação por Alumínio.

2. Como o Sistema Toma a Decisão (Gatilhos de Aplicação)
O aplicativo não pergunta qual método o usuário quer usar; ele roteia a recomendação automaticamente seguindo o Manual de 2016.
Escolha do Método Principal:
Se SMP <= 6,3: O sistema usa a Tabela SMP (buscando o valor para pH alvo 6,0).
Se SMP > 6,3: No modo Avançado, o sistema usa a Equação Polinomial. No modo Simplificado, ele segue usando a Tabela SMP mas emite um alerta de que o ideal seria o uso de dados avançados.
Quando o sistema diz "NÃO APLICAR":
Em qualquer sistema: Se o pH em água for => 5,5, o app avisa que não há necessidade de calagem e encerra o fluxo.
No PD Consolidado (Trava do Manual): Se o pH for < 5,5, mas no modo avançado for detectado que a Saturação por Bases (V) => 65% e a saturação por Alumínio (m) for < 10%, o sistema entende que o solo está bem tamponado e zera a recomendação.

3. Fatores de Correção e Limites (Travas de Segurança)
Após calcular a dose base (seja por Tabela SMP ou Polinomial), o sistema aplica as regras de manejo:
Convencional: Aplica 100% da dose calculada (incorporada a 20cm).
Plantio Direto Consolidado: Multiplica a dose calculada por 0,25 (1/4 da dose base).
Limite Máximo no PD Consolidado: Se a dose final (já multiplicada por 0,25) passar de 5 t/ha, o sistema trava o resultado em 5,0 t/ha e gera um alerta.
Implantação de PD (Campo Natural): Se o produtor optar por aplicação superficial em campo natural (e o SMP for > 5,5), o sistema multiplica a dose da tabela por 0,5 (metade da dose).
Monitoramento 10-20cm: Se houver restrição na camada profunda (detectada via monitoramento), o sistema recomenda o reinício do sistema com incorporação total (fator 1.0).
Correção de PRNT: A última etapa do sistema é sempre aplicar a fórmula do PRNT real do produto comercial: Dose Final = Dose Calculada * (100 / PRNT).

4. Exemplos Práticos para Conferência Manual (Testes do Sistema)
Abaixo estão os cenários exatos que o sistema testa automaticamente nos bastidores. O objetivo é validar se as fórmulas e os limites programados batem com os cálculos manuais do agrônomo. (Todos os exemplos abaixo assumem PRNT 100% para facilitar a validação da regra base).

Exemplo 1 Corrigido: Cálculo normal no PD Consolidado
Dados informados na tela: Sistema = PD Consolidado, Primeira Calagem = Sim, PRNT = 100%, pH em água = 5,2, Índice SMP = 5,5.
Ação do Sistema (Campos Condicionais): Como é PD Consolidado e o pH é menor que 5,5, o sistema reage e abre o campo para o produtor informar a Saturação por Alumínio (Al_sat). O produtor informa Al_sat = 15%.
Passo 1 (Trava): O sistema verifica que o solo não se enquadra na trava de não-aplicação (pois o Al_sat não é menor que 10%), então prossegue para o cálculo.
Passo 2 (Tabela): Para SMP 5,5 visando pH 6,0, a Tabela 5.2 indica 6,1 t/ha.
Passo 3 (Fator PD): Aplica a regra de 1/4 (0,25) para PD Consolidado: 6,1 t/ha * 0,25 = 1,525 t/ha.
Resultado do Sistema: Recomenda 1,525 t/ha em superfície.

Exemplo 2: Teste da Trava Máxima de 5 Toneladas (PD Consolidado)
Dados informados na tela: Sistema = PD Consolidado, Primeira Calagem = Sim, PRNT = 100%, pH em água = 5,0, Índice SMP = 4,4.
Ação do Sistema: Como o pH (5,0) é menor que 5,5, o gatilho de calagem é ativado e o sistema solicita a Saturação por Alumínio (Al_sat). O produtor informa Al_sat = 20%.
Passo 1 (Trava): O sistema verifica a trava e vê que o Al_sat não é menor que 10%, então a calagem está liberada.
Passo 2 (Tabela): Para SMP 4,4 visando pH 6,0, a Tabela indica 21,0 t/ha.
Passo 3 (Fator PD): Aplica a regra de 1/4 (fator 0,25) exigida para PD Consolidado: 21,0 t/ha * 0,25 = 5,25 t/ha.
Resultado do Sistema: Como o valor passou de 5 t/ha, o sistema obedece ao limite superficial, trava a recomendação em 5,0 t/ha e gera um alerta informando que a correção completa exigirá reaplicação futura.

Exemplo 3: Roteamento para a Equação Polinomial
Dados informados na tela: Sistema = Convencional, Primeira Calagem = Sim, PRNT = 100%, pH em água = 5,2, Índice SMP = 6,5.
Ação do Sistema: Como o pH (5,2) é menor que 5,5, a calagem é necessária. Porém, como o SMP (6,5) é maior que 6,3, o sistema entende que a Tabela subestimará a acidez. Ele muda o método para Polinomial e abre os campos extras na tela. O produtor informa: Matéria Orgânica = 2,0% e Alumínio = 0,5 cmolc/dm³.
Cálculo da Equação: Dose = -0,516 + (0,805 * MO) + (2,435 * Al).
Substituindo: -0,516 + (0,805 * 2,0) + (2,435 * 0,5)
Resolvendo: -0,516 + 1,610 + 1,2175 = 2,311 t/ha.
Resultado do Sistema: Recomenda 2,311 t/ha incorporado a 20 cm.

Exemplo 4: A Trava de Não-Aplicação no PD Consolidado
Dados informados na tela: Sistema = PD Consolidado, Primeira Calagem = Não (Reaplicação), PRNT = 100%, pH em água = 5,2, Índice SMP = 5,8.
Ação do Sistema: Por ser reaplicação com SMP <= 6,3, o sistema solicita a Saturação por Bases (V_atual). O produtor informa V_atual = 66,0%. Como o pH é < 5,5 e o sistema é PD Consolidado, o sistema pede também a Saturação por Alumínio (Al_sat). O produtor informa Al_sat = 8,0%.
Análise da Trava: O sistema analisa a regra do Manual: V_atual >= 65% E Al_sat < 10%. Ambas as condições são verdadeiras (66 >= 65 e 8 < 10).
Resultado do Sistema: O sistema conclui que o solo está bem tamponado, zera a dose (0,0 t/ha) e emite a mensagem de que a calagem não é recomendada neste momento.

Exemplo 5: Método Saturação por Bases (Segunda Opinião/Referência)
Dados informados na tela: Sistema = Convencional, Primeira Calagem = Não (Reaplicação), PRNT = 100%, pH em água = 5,1, Índice SMP = 5,5.
Ação do Sistema: O pH baixo dispara o gatilho de necessidade. Por ser área de reaplicação (e SMP =< 6,3), o sistema coleta o V_atual e a CTC para rodar o cálculo comparativo. Produtor informa V_atual = 55,0% e CTC = 10,0 cmolc/dm³.
Passo 1 (Cálculo Principal - SMP): Pela tabela, SMP 5,5 para pH 6,0 resulta em 6,1 t/ha.
Passo 2 (Cálculo Referência - Sat. Bases): Para grãos, o V% desejado é 75%. Fórmula: ((75 - 55) / 100) * 10 = (20 / 100) * 10 = 2,0 t/ha.
Resultado do Sistema: Exibe 6,1 t/ha como a recomendação principal (Método SMP) e exibe as 2,0 t/ha (Método Saturação por Bases) como informação de referência para o técnico responsável avaliar.

Exemplo 6: Implantação de PD com Superficial em Campo Natural
Dados informados na tela: Sistema = Implantação PD, Primeira Calagem = Sim, PRNT = 100%, pH em água = 5,0, Índice SMP = 5,8. Opção de aplicação: "Superficial em Campo Natural" = Marcada.
Passo 1 (Tabela): Para SMP 5,8 visando pH 6,0, a Tabela indica 4,2 t/ha.
Passo 2 (Fator da Regra): Em campo natural com aplicação superficial, e com SMP > 5,5, o manual determina aplicar metade da dose (fator 0,5), ao invés de incorporar 100%.
Resultado do Sistema: 4,2 * 0,5 = 2,1 t/ha aplicados em superfície.
