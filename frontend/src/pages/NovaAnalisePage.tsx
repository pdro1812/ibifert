import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, TableProperties } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinhaAmostra {
  id: number;
  camada: string;
  ph: string;
  smp: string;
  mo: string;
  v: string;
  m: string;
  al: string;
}

const CAMPOS_NUMERICOS: Array<{ key: keyof Omit<LinhaAmostra, 'id' | 'camada'>; label: string }> = [
  { key: 'ph',  label: 'pH'       },
  { key: 'smp', label: 'SMP'      },
  { key: 'mo',  label: 'MO (%)'   },
  { key: 'v',   label: 'V (%)'    },
  { key: 'm',   label: 'm (%)'    },
  { key: 'al',  label: 'Al (cmolc)' },
];

const FAZENDAS_MOCK = ['Fazenda Bela Vista'];
const TALHOES_MOCK  = ['Talhão Sul', 'Talhão Norte'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NovaAnalisePage() {
  const navigate = useNavigate();

  // ── Local UI state ────────────────────────────────────────────────────────
  const [linhas, setLinhas] = useState<LinhaAmostra[]>([
    { id: 1, camada: '0-20', ph: '', smp: '', mo: '', v: '', m: '', al: '' },
  ]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const adicionarLinha = () => {
    setLinhas((prev) => [
      ...prev,
      { id: Date.now(), camada: '', ph: '', smp: '', mo: '', v: '', m: '', al: '' },
    ]);
  };

  const atualizarCampo = (
    id: number,
    campo: keyof Omit<LinhaAmostra, 'id'>,
    valor: string
  ) => {
    setLinhas((prev) =>
      prev.map((linha) => (linha.id === id ? { ...linha, [campo]: valor } : linha))
    );
  };

  const removerLinha = (id: number) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl">
      {/* Header */}
      <div className="bg-stone-900 p-8 text-white">
        <h2 className="flex items-center gap-3 text-2xl font-bold">
          <TableProperties className="text-green-400" />
          Inserção Rápida de Amostras
        </h2>
        <p className="mt-1 text-stone-400">
          Cadastre múltiplas amostras de solo para salvar no histórico do talhão.
        </p>
      </div>

      <div className="space-y-8 p-8">
        {/* Contexto da análise */}
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-stone-200 bg-stone-50 p-6 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-stone-700">Fazenda</label>
            <select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500">
              {FAZENDAS_MOCK.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Talhão</label>
            <select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500">
              <option value="">Selecione...</option>
              {TALHOES_MOCK.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Data da Coleta</label>
            <input
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
            />
          </div>
        </div>

        {/* Tabela de amostras */}
        <div className="overflow-x-auto overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-100 text-xs font-bold uppercase text-stone-600">
              <tr>
                <th className="w-10 border-r border-stone-200 px-4 py-3 text-center">#</th>
                <th className="border-r border-stone-200 px-4 py-3">Camada (cm)</th>
                {CAMPOS_NUMERICOS.map(({ key, label }) => (
                  <th key={key} className="border-r border-stone-200 px-4 py-3 text-center last:border-0">
                    {label}
                  </th>
                ))}
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, index) => (
                <tr
                  key={linha.id}
                  className="group border-b border-stone-100 last:border-0 hover:bg-green-50/40"
                >
                  {/* Número da linha */}
                  <td className="border-r border-stone-100 px-4 py-2 text-center font-mono text-xs text-stone-400">
                    {index + 1}
                  </td>

                  {/* Camada */}
                  <td className="border-r border-stone-100 p-0">
                    <input
                      type="text"
                      value={linha.camada}
                      onChange={(e) => atualizarCampo(linha.id, 'camada', e.target.value)}
                      placeholder="0-20"
                      className="w-full bg-transparent px-4 py-2.5 text-sm outline-none focus:bg-white"
                    />
                  </td>

                  {/* Campos numéricos */}
                  {CAMPOS_NUMERICOS.map(({ key }) => (
                    <td key={key} className="border-r border-stone-100 p-0 last:border-0">
                      <input
                        type="number"
                        step="0.1"
                        value={linha[key]}
                        onChange={(e) => atualizarCampo(linha.id, key, e.target.value)}
                        className="w-full bg-transparent px-4 py-2.5 text-center font-mono text-sm outline-none focus:bg-white"
                      />
                    </td>
                  ))}

                  {/* Remover linha */}
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removerLinha(linha.id)}
                      disabled={linhas.length === 1}
                      className="rounded p-1 text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100 disabled:pointer-events-none"
                      title="Remover linha"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Botão adicionar linha */}
          <div className="border-t border-stone-200 bg-stone-50 p-2">
            <button
              type="button"
              onClick={adicionarLinha}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 py-2.5 text-sm text-stone-500 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-600"
            >
              <Plus size={16} /> Adicionar Linha
            </button>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-5 py-3 text-sm text-stone-500">
          <span className="font-semibold text-stone-700">{linhas.length}</span>
          {linhas.length === 1 ? 'amostra' : 'amostras'} cadastrada{linhas.length === 1 ? '' : 's'}
          &nbsp;·&nbsp;
          Todas as colunas são opcionais, mas pH e SMP são obrigatórios para o cálculo.
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm font-semibold text-stone-500 transition-colors hover:text-stone-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-green-600 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-green-700 active:scale-[0.98]"
          >
            Salvar e Processar <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}