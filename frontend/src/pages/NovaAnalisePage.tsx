import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Plus, TableProperties, Tractor, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getFazendas, postAnalisesBulk } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Talhao {
  id: string;
  nome: string;
  cultura: string;
}

interface Fazenda {
  id: string;
  nome: string;
  municipio: string;
  uf: string;
  talhoes: Talhao[];
}

interface LinhaAmostra {
  id: string;
  talhao_id: string;
  identificacao: string;
  ph: string;
  smp: string;
  mo: string;
  al_trocavel: string;
  v_atual: string;
  ctc: string;
  al_sat: string;
}

const CAMPOS_NUMERICOS: Array<{ key: keyof Omit<LinhaAmostra, 'id' | 'identificacao' | 'talhao_id'>; label: string; placeholder: string }> = [
  { key: 'ph',          label: 'pH',         placeholder: '5.2' },
  { key: 'smp',         label: 'SMP',        placeholder: '5.5' },
  { key: 'mo',          label: 'MO (%)',     placeholder: '2.5' },
  { key: 'al_trocavel', label: 'Al (cmolc)',  placeholder: '0.5' },
  { key: 'v_atual',     label: 'V (%)',      placeholder: '55'  },
  { key: 'ctc',         label: 'CTC',        placeholder: '10'  },
  { key: 'al_sat',      label: 'm (%)',      placeholder: '15'  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NovaAnalisePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateTalhaoId = location.state?.talhaoId as string | undefined;

  // ── Data state ────────────────────────────────────────────────────────────
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [fazendaId, setFazendaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // ── Configurações Globais (Aplicadas a todas as amostras) ─────────────────
  const [sistemaManejo, setSistemaManejo] = useState<'CONVENCIONAL' | 'PD_IMPLANTACAO' | 'PD_CONSOLIDADO'>('CONVENCIONAL');
  const [prnt, setPrnt] = useState('90');
  const [primeiraCalagem, setPrimeiraCalagem] = useState(true);

  // ── Amostras ──────────────────────────────────────────────────────────────
  const [linhas, setLinhas] = useState<LinhaAmostra[]>([
    { id: '1', talhao_id: '', identificacao: 'Amostra 1', ph: '', smp: '', mo: '', al_trocavel: '', v_atual: '', ctc: '', al_sat: '' },
  ]);

  // ── Carregamento Inicial ──────────────────────────────────────────────────
  useEffect(() => {
    getFazendas()
      .then((data) => {
        setFazendas(data);
        if (data.length > 0) {
          if (stateTalhaoId) {
            const fazendaDesteTalhao = data.find((f: Fazenda) => f.talhoes.some((t: Talhao) => t.id === stateTalhaoId));
            if (fazendaDesteTalhao) {
              setFazendaId(fazendaDesteTalhao.id);
              setLinhas([{ id: '1', talhao_id: stateTalhaoId, identificacao: 'Amostra 1', ph: '', smp: '', mo: '', al_trocavel: '', v_atual: '', ctc: '', al_sat: '' }]);
              return;
            }
          }
          setFazendaId(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [stateTalhaoId]);

  const fazendaSelecionada = fazendas.find(f => f.id === fazendaId);
  const talhoesDisponiveis = fazendaSelecionada?.talhoes ?? [];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const adicionarLinha = () => {
    const novoId = Math.random().toString(36).substr(2, 9);
    setLinhas((prev) => [
      ...prev,
      { id: novoId, talhao_id: prev[prev.length - 1]?.talhao_id || '', identificacao: `Amostra ${prev.length + 1}`, ph: '', smp: '', mo: '', al_trocavel: '', v_atual: '', ctc: '', al_sat: '' },
    ]);
  };

  const atualizarCampo = (id: string, campo: keyof LinhaAmostra, valor: string) => {
    setLinhas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l))
    );
  };

  const removerLinha = (id: string) => {
    if (linhas.length === 1) return;
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSalvarTudo = async () => {
    if (!fazendaSelecionada) {
      alert('Selecione uma fazenda para prosseguir.');
      return;
    }

    const amostrasValidas = linhas.filter(l => l.ph && l.smp && l.talhao_id);

    if (amostrasValidas.length === 0) {
      alert('Preencha pelo menos o pH, o SMP e selecione o talhão de uma amostra.');
      return;
    }
    
    setProcessando(true);
    try {
      // Agrupar amostras por talhao_id
      const amostrasPorTalhao = amostrasValidas.reduce((acc, l) => {
        if (!acc[l.talhao_id]) acc[l.talhao_id] = [];
        acc[l.talhao_id].push({
          modo: 'avancado',
          sistema_manejo: sistemaManejo,
          primeira_calagem: primeiraCalagem,
          PRNT: Number(prnt),
          identificacao: l.identificacao,
          pH_agua: Number(l.ph),
          SMP: Number(l.smp),
          MO: l.mo ? Number(l.mo) : undefined,
          Al_trocavel: l.al_trocavel ? Number(l.al_trocavel) : undefined,
          V_atual: l.v_atual ? Number(l.v_atual) : undefined,
          CTC_pH7: l.ctc ? Number(l.ctc) : undefined,
          Al_sat: l.al_sat ? Number(l.al_sat) : undefined,
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Disparar requisições em paralelo
      await Promise.all(
        Object.entries(amostrasPorTalhao).map(([tId, amostras]) => 
          postAnalisesBulk({
            talhao_id: tId,
            uf: fazendaSelecionada.uf,
            cidade: fazendaSelecionada.municipio,
            amostras
          })
        )
      );

      setSucesso(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar e salvar análises.');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-green-600" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl">
      {/* Header */}
      <div className="bg-stone-900 p-8 text-white">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <TableProperties className="text-green-400" />
            Inserção Rápida de Amostras
          </h2>
          {sucesso && (
            <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-4 py-1.5 text-sm font-bold text-green-400">
              <CheckCircle2 size={16} /> Sucesso! Redirecionando...
            </div>
          )}
        </div>
        <p className="mt-1 text-stone-400">
          Cadastre múltiplas amostras de solo de uma só vez para diferentes talhões.
        </p>
      </div>

      <div className="space-y-6 p-8">
        {/* 1. Contexto de Localização e Configuração Global */}
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-stone-100 bg-stone-50 p-6 lg:grid-cols-2">
          {/* Localização */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
              <MapPin size={16} /> Localização
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-600">Fazenda</label>
                <select 
                  value={fazendaId}
                  onChange={(e) => { setFazendaId(e.target.value); }}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 shadow-sm"
                >
                  {fazendas.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Configurações Globais */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
              <Tractor size={16} /> Configurações do Solo (Fixas para o lote)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-stone-600">Manejo</label>
                <select 
                  value={sistemaManejo}
                  onChange={(e) => setSistemaManejo(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 shadow-sm"
                >
                  <option value="CONVENCIONAL">Convencional</option>
                  <option value="PD_IMPLANTACAO">PD Implantação</option>
                  <option value="PD_CONSOLIDADO">PD Consolidado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600">Aplicação</label>
                <select 
                   value={primeiraCalagem ? 'true' : 'false'}
                   onChange={(e) => setPrimeiraCalagem(e.target.value === 'true')}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 shadow-sm"
                >
                  <option value="true">1ª Calagem</option>
                  <option value="false">Reaplicação</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600">PRNT (%)</label>
                <input
                  type="number"
                  value={prnt}
                  onChange={(e) => setPrnt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-500 text-center shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Tabela de Amostras */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="w-12 px-4 py-4 text-center">#</th>
                  <th className="min-w-[150px] px-4 py-4">ID Amostra / Gleba</th>
                  <th className="min-w-[150px] px-4 py-4">Talhão</th>
                  {CAMPOS_NUMERICOS.map(({ key, label }) => (
                    <th key={key} className="w-24 px-2 py-4 text-center">{label}</th>
                  ))}
                  <th className="w-12 px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {linhas.map((linha, index) => (
                  <tr key={linha.id} className="group hover:bg-green-50/30 transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-xs text-stone-400">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={linha.identificacao}
                        onChange={(e) => atualizarCampo(linha.id, 'identificacao', e.target.value)}
                        placeholder="Ex: Ponto 01"
                        className="w-full rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-stone-200 focus:bg-stone-50 transition-all"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={linha.talhao_id}
                        onChange={(e) => atualizarCampo(linha.id, 'talhao_id', e.target.value)}
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-2 text-sm outline-none focus:border-stone-200 focus:bg-white transition-all"
                      >
                        <option value="">Selecione...</option>
                        {talhoesDisponiveis.map((t) => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </td>
                    {CAMPOS_NUMERICOS.map(({ key, placeholder }) => (
                      <td key={key} className="px-1 py-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder={placeholder}
                          value={linha[key]}
                          onChange={(e) => atualizarCampo(linha.id, key, e.target.value)}
                          className="w-full rounded-lg border border-transparent px-2 py-2 text-center font-mono text-sm outline-none focus:border-stone-200 focus:bg-white placeholder:text-stone-300 transition-all"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removerLinha(linha.id)}
                        disabled={linhas.length === 1}
                        className="rounded-lg p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-0 transition-all"
                        title="Remover amostra"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-stone-100 bg-stone-50/50 p-3">
            <button
              onClick={adicionarLinha}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 py-3 text-sm font-bold text-stone-500 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-600"
            >
              <Plus size={18} /> Adicionar Nova Amostra
            </button>
          </div>
        </div>

        {/* 3. Rodapé informativo e Ações */}
        <div className="flex flex-col gap-6 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-stone-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
              <AlertCircle size={20} className="text-stone-400" />
            </div>
            <p className="text-xs leading-tight">
              Dica: O sistema processará cada linha individualmente usando o motor avançado.<br/>
              Campos em branco serão ignorados pelo motor de cálculo.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-xl px-6 py-3 text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvarTudo}
              disabled={processando || !fazendaId}
              className="flex items-center gap-2 rounded-xl bg-stone-900 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-stone-800 disabled:bg-stone-300 active:scale-[0.98]"
            >
              {processando ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processando...
                </>
              ) : (
                <>Salvar e Processar {linhas.length} amostras <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
