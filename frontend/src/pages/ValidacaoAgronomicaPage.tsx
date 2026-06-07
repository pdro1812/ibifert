import { useState } from 'react';
import { Play, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { api, calcularCalagem } from '../services/api';
import type { CalagemResultado, EntradaCalagem } from '../schemas/calagemSchema';
import { detectarRestricaoMonitoramento } from '../schemas/calagemSchema';

type Exemplo = {
  id: number;
  titulo: string;
  dados: EntradaCalagem;
  esperado: string;
  observacao?: string;
};

const EXEMPLOS: Exemplo[] = [
  {
    id: 1,
    titulo: 'Exemplo 1: Cálculo normal no PD Consolidado',
    dados: {
      modo: 'avancado',
      sistema_manejo: 'PD_CONSOLIDADO',
      primeira_calagem: true,
      PRNT: 100,
      pH_agua: 5.2,
      SMP: 5.5,
      Al_sat: 15,
    },
    esperado: 'Recomenda 1,525 t/ha em superfície.',
  },
  {
    id: 2,
    titulo: 'Exemplo 2: Teste da Trava Máxima de 5 Toneladas (PD Consolidado)',
    dados: {
      modo: 'avancado',
      sistema_manejo: 'PD_CONSOLIDADO',
      primeira_calagem: true,
      PRNT: 100,
      pH_agua: 5.0,
      SMP: 4.4,
      Al_sat: 20,
    },
    esperado: 'Limite superficial, trava a recomendação em 5,0 t/ha e gera um alerta.',
    observacao: 'Trava Máxima de 5 Toneladas: Trata da aplicação do limite agronômico rígido para a calagem superficial, em que o cálculo deve ser limitado ao teto de 5,0 t/ha para evitar problemas de supercalagem na microcamada superior do solo. O Motor Original aplica esta trava de segurança.',
  },
  {
    id: 3,
    titulo: 'Exemplo 3: Roteamento para a Equação Polinomial',
    dados: {
      modo: 'avancado',
      sistema_manejo: 'CONVENCIONAL',
      primeira_calagem: true,
      PRNT: 100,
      pH_agua: 5.2,
      SMP: 6.5,
      MO: 2.0,
      Al_trocavel: 0.5,
    },
    esperado: 'Recomenda 2,31 t/ha incorporado a 20 cm.',
    observacao: 'Roteamento para a Equação Polinomial: Aborda a diferença na precisão dos resultados devido à escolha do método matemático, onde o backend executa a equação contínua e dinâmica para o índice SMP, enquanto o SQL realiza apenas uma busca estática na tabela padrão de correspondência. O Motor Original é mais preciso.',
  },
  {
    id: 4,
    titulo: 'Exemplo 4: A Trava de Não-Aplicação no PD Consolidado',
    dados: {
      modo: 'avancado',
      sistema_manejo: 'PD_CONSOLIDADO',
      primeira_calagem: false,
      PRNT: 100,
      pH_agua: 5.2,
      SMP: 5.8,
      V_atual: 66,
      Al_sat: 8,
      CTC_pH7: 10,
    },
    esperado: 'O solo está bem tamponado, zera a dose (0,0 t/ha) e emite mensagem de que não é recomendada.',
    observacao: 'Trava de Não-Aplicação no PD Consolidado: Destaca a regra de tomada de decisão que bloqueia e zera a recomendação de calagem quando os indicadores químicos (como a saturação de bases e o alumínio) apontam que o solo já está quimicamente equilibrado e tamponado. O Motor Original implementa esta trava.',
  },
  {
    id: 5,
    titulo: 'Exemplo 5: Método Saturação por Bases (Segunda Opinião/Referência)',
    dados: {
      modo: 'avancado',
      sistema_manejo: 'CONVENCIONAL',
      primeira_calagem: false,
      PRNT: 100,
      pH_agua: 5.1,
      SMP: 5.5,
      V_atual: 55,
      CTC_pH7: 10,
    },
    esperado: 'Exibe 6,1 t/ha como recomendação principal e exibe 2,0 t/ha como referência.',
  },
  {
    id: 6,
    titulo: 'Exemplo 6: Implantação de PD com Superficial em Campo Natural',
    dados: {
      modo: 'avancado',
      sistema_manejo: 'PD_IMPLANTACAO',
      primeira_calagem: true,
      PRNT: 100,
      pH_agua: 5.0,
      SMP: 5.8,
      opcao_superficial_campo_natural: true,
    },
    esperado: '2,1 t/ha aplicados em superfície.',
    observacao: 'Implantação de PD com Superficial em Campo Natural: Analisa a necessidade de reduzir a dose calculada pela metade (fator 0.5) pelo fato de a aplicação superficial sem incorporação corrigir apenas a camada de 0 a 10 cm de profundidade do solo, em vez dos 20 cm padrão. O Motor Original aplica o fator 0.5 conforme o manual.',
  },
];

export function ValidacaoAgronomicaPage() {
  const [exemploAtivo, setExemploAtivo] = useState<Exemplo | null>(null);
  const [resultadoOriginal, setResultadoOriginal] = useState<CalagemResultado | null>(null);
  const [resultadoSql, setResultadoSql] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executarExemplo = async (exemplo: Exemplo) => {
    setExemploAtivo(exemplo);
    setResultadoOriginal(null);
    setResultadoSql(null);
    setErro(null);
    setLoading(true);

    try {
      // 1. Chamar Motor Original
      const resOriginal = await calcularCalagem(exemplo.dados, {
        uf: 'RS',
        cidade: 'Ibirubá',
        modo_al_sat: 'direto',
      });
      setResultadoOriginal(resOriginal);

      // 2. Chamar Motor SQL (Mapeando EntradaCalagem -> Standalone Payload)
      const { dados } = exemplo;
      let payloadSql: any = {
        prnt: dados.PRNT,
        ph_referencia: 6,
      };

      if (dados.sistema_manejo === 'CONVENCIONAL' || dados.sistema_manejo === 'PD_IMPLANTACAO') {
        payloadSql.tipo_sistema = dados.sistema_manejo;
        payloadSql.ph_0_20 = dados.pH_agua;
        payloadSql.smp_0_20 = dados.SMP;
      } else if (dados.sistema_manejo === 'PD_CONSOLIDADO') {
        if (detectarRestricaoMonitoramento(dados.monitoramento)) {
          payloadSql.tipo_sistema = 'DIRETO_CONSOLIDADO_COM_RESTRICAO';
          payloadSql.ph_10_20 = dados.monitoramento?.pH_agua_10_20;
          payloadSql.smp_10_20 = dados.SMP_10_20;
          payloadSql.saturacao_aluminio_10_20 = dados.monitoramento?.Al_sat_10_20;
        } else {
          payloadSql.tipo_sistema = 'DIRETO_CONSOLIDADO_SEM_RESTRICAO';
          payloadSql.ph_0_10 = dados.pH_agua;
          payloadSql.smp_0_10 = dados.SMP;
          payloadSql.saturacao_base_0_10 = dados.V_atual ?? 0;
          payloadSql.saturacao_aluminio_0_10 = dados.Al_sat ?? 0;
        }
      }

      const resSql = await api.post('/standalone/calcular', payloadSql);
      setResultadoSql(resSql.data);

    } catch (err: any) {
      setErro(err.response?.data?.mensagem || err.response?.data?.error || err.message || 'Erro ao calcular');
    } finally {
      setLoading(false);
    }
  };

  const saoIguais = resultadoOriginal && resultadoSql && 
    Math.abs((resultadoOriginal.NC_ajustada || 0) - resultadoSql.dose_recomendada) < 0.001;

  return (
    <div className="flex w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl lg:flex-row">
      {/* ── Esquerda: Lista de Exemplos ── */}
      <div className="w-full bg-stone-50 p-8 lg:w-1/4 lg:border-r lg:border-stone-200 lg:p-10">
        <h2 className="mb-6 text-xl font-bold text-stone-800">Cenários de Teste</h2>
        <p className="mb-8 text-sm text-stone-500">
          Selecione um exemplo para comparar os dois motores.
        </p>

        <div className="flex flex-col gap-3">
          {EXEMPLOS.map((ex) => (
            <button
              key={ex.id}
              onClick={() => executarExemplo(ex)}
              className={`flex w-full flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                exemploAtivo?.id === ex.id
                  ? 'border-green-500 bg-green-50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-100'
              }`}
            >
              <span className="text-xs font-bold text-stone-800">
                {ex.id}. {ex.titulo.split(':')[1]?.trim() || ex.titulo}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Direita: Validação ── */}
      <div className="flex w-full flex-col bg-white p-8 lg:w-3/4 lg:p-10">
        {exemploAtivo ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-stone-800">{exemploAtivo.titulo}</h2>
              {resultadoOriginal && resultadoSql && (
                <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${
                  saoIguais ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {saoIguais ? 'Batimento OK' : 'Divergência'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">Payload Original</h3>
                <pre className="overflow-x-auto text-[10px] text-stone-700">
                  {JSON.stringify(exemploAtivo.dados, null, 2)}
                </pre>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-blue-100 bg-blue-50 p-5">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-blue-800">Comportamento Esperado</h3>
                <p className="text-xs leading-relaxed text-blue-900">{exemploAtivo.esperado}</p>
              </div>
            </div>

            <div className="h-px w-full bg-stone-100" />

            {/* Resultado da API */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-stone-800">Comparativo de Motores</h3>
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />}
              </div>

              {erro && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <AlertCircle size={18} />
                  <span className="text-sm font-semibold">{erro}</span>
                </div>
              )}

              {(resultadoOriginal || resultadoSql) && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Motor Original */}
                  <div className={`rounded-3xl border-2 p-6 transition-all ${
                    saoIguais ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'
                  }`}>
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">Motor Original</p>
                    {resultadoOriginal ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-stone-800">{resultadoOriginal.NC_ajustada?.toFixed(3)}</span>
                          <span className="text-sm font-bold text-stone-400">t/ha</span>
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-stone-600">
                          <p><strong>Método:</strong> {resultadoOriginal.metodo_calc_roteado}</p>
                          <p><strong>Aplicação:</strong> {resultadoOriginal.modo_aplicacao}</p>
                        </div>
                      </div>
                    ) : <p className="text-xs text-stone-400 italic">Aguardando...</p>}
                  </div>

                  {/* Motor SQL */}
                  <div className={`rounded-3xl border-2 p-6 transition-all ${
                    saoIguais ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'
                  }`}>
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">Motor SQL</p>
                    {resultadoSql ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-stone-800">{resultadoSql.dose_recomendada?.toFixed(3)}</span>
                          <span className="text-sm font-bold text-stone-400">t/ha</span>
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-stone-600">
                          <p><strong>Status:</strong> {resultadoSql.erro ? 'Alerta' : 'OK'}</p>
                          <p><strong>SQL Msg:</strong> {resultadoSql.msg}</p>
                        </div>
                      </div>
                    ) : <p className="text-xs text-stone-400 italic">Aguardando...</p>}
                  </div>
                </div>
              )}

              {/* Mensagens e Diferenças */}
              {(resultadoOriginal || resultadoSql) && (
                <div className="grid grid-cols-1 gap-4">
                  {exemploAtivo.observacao && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={18} className="text-blue-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800">Nota Técnica de Comparação</h4>
                      </div>
                      <p className="text-xs leading-relaxed text-blue-900 italic">
                        {exemploAtivo.observacao}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">Parecer Comparativo</h4>
                    <div className="space-y-4 text-sm leading-relaxed">
                      <div className="flex gap-3">
                        <ChevronRight size={16} className="text-green-500 shrink-0 mt-0.5" />
                        <p><span className="font-bold text-stone-700">SQL:</span> {resultadoSql?.msg}</p>
                      </div>
                      {resultadoOriginal?.alertas && resultadoOriginal.alertas.length > 0 && (
                        <div className="flex gap-3">
                          <ChevronRight size={16} className="text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-stone-700">Original (Alertas):</span>
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-stone-500">
                              {resultadoOriginal.alertas.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">
            <div className="flex flex-col items-center gap-3">
              <Play size={48} className="opacity-20" />
              <p>Selecione um cenário ao lado para comparar os motores.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
