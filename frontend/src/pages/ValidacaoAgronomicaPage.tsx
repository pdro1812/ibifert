import { useState } from 'react';
import { Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { calcularCalagem } from '../services/api';
import type { CalagemResultado, EntradaCalagem } from '../schemas/calagemSchema';

type Exemplo = {
  id: number;
  titulo: string;
  dados: EntradaCalagem;
  esperado: string;
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
      CTC_pH7: 10, // Adicionado para satisfazer a validação de reaplicação
    },
    esperado: 'O solo está bem tamponado, zera a dose (0,0 t/ha) e emite mensagem de que não é recomendada.',
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
  },
];

export function ValidacaoAgronomicaPage() {
  const [exemploAtivo, setExemploAtivo] = useState<Exemplo | null>(null);
  const [resultado, setResultado] = useState<CalagemResultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executarExemplo = async (exemplo: Exemplo) => {
    setExemploAtivo(exemplo);
    setResultado(null);
    setErro(null);
    setLoading(true);

    try {
      const res = await calcularCalagem(exemplo.dados, {
        uf: 'RS',
        cidade: 'Ibirubá',
        modo_al_sat: 'direto',
      });
      setResultado(res);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || err.message || 'Erro ao calcular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl lg:flex-row">
      {/* ── Esquerda: Lista de Exemplos ── */}
      <div className="w-full bg-stone-50 p-8 lg:w-1/3 lg:border-r lg:border-stone-200 lg:p-12">
        <h2 className="mb-6 text-xl font-bold text-stone-800">Cenários de Teste</h2>
        <p className="mb-8 text-sm text-stone-500">
          Selecione um exemplo abaixo (retirado do revisao.md) para enviar o payload e verificar o resultado em tempo real.
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
              <span className="text-sm font-bold text-stone-800">
                {ex.id}. {ex.titulo.split(':')[1]?.trim() || ex.titulo}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Direita: Validação ── */}
      <div className="flex w-full flex-col bg-white p-8 lg:w-2/3 lg:p-12">
        {exemploAtivo ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-stone-800">{exemploAtivo.titulo}</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Payload Enviado */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">Payload Enviado</h3>
                <pre className="overflow-x-auto text-xs text-stone-700">
                  {JSON.stringify(exemploAtivo.dados, null, 2)}
                </pre>
              </div>

              {/* Resultado Esperado (Revisão.md) */}
              <div className="flex flex-col justify-center rounded-xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-800">Comportamento Esperado</h3>
                <p className="text-sm leading-relaxed text-blue-900">{exemploAtivo.esperado}</p>
              </div>
            </div>

            <div className="h-px w-full bg-stone-100" />

            {/* Resultado da API */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-stone-800">Resultado do Motor</h3>
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />}
              </div>

              {erro && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                  <AlertCircle size={18} />
                  <span className="text-sm font-semibold">{erro}</span>
                </div>
              )}

              {resultado && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
                    <p className="mb-2 text-sm font-bold uppercase tracking-wider text-green-800">Diagnóstico Principal</p>
                    {resultado.aplicar_calcario ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold text-green-700">{resultado.NC_final?.toFixed(2)}</span>
                          <span className="text-lg font-bold text-green-800">t/ha</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-green-900">Ajustado: {resultado.NC_ajustada?.toFixed(2)} t/ha</p>
                        <p className="mt-1 text-sm text-green-800">Aplicação: {resultado.modo_aplicacao}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 size={24} />
                        <span className="text-lg font-bold">Não Aplicar (0.00 t/ha)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5">
                    <p className="text-sm font-bold text-stone-700">Detalhes Técnicos</p>
                    <div className="text-xs text-stone-600">
                      <strong>Método:</strong> {resultado.metodo_calc_roteado}
                    </div>
                    {resultado.NC_vb !== undefined && (
                      <div className="text-xs text-stone-600">
                        <strong>NC (Saturação por Bases):</strong> {resultado.NC_vb?.toFixed(2)} t/ha
                      </div>
                    )}
                    {resultado.alertas && resultado.alertas.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <strong className="text-xs text-orange-600">Alertas:</strong>
                        <ul className="list-disc pl-4 text-xs text-stone-600">
                          {resultado.alertas.map((alerta, i) => (
                            <li key={i}>{alerta}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">
            <div className="flex flex-col items-center gap-3">
              <Play size={48} className="opacity-20" />
              <p>Selecione um exemplo ao lado para validar.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
