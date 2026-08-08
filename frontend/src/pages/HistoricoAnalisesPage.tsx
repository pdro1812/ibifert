import { useEffect, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  MapPin,
  Search,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { ModalDetalhesAnalise } from '../components/ModalDetalhesAnalise';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnaliseResumo {
  id: string;
  criado_em: string;
  uf: string;
  cidade: string;
  identificacao: string | null;
  tipo: 'CALAGEM' | 'ADUBACAO';
  
  // Calagem
  sistema_manejo?: string;
  primeira_calagem?: boolean;
  pH_agua?: number;
  SMP?: number;
  PRNT?: number;
  aplicar_calcario?: boolean | null;
  NC_ajustada?: number | null;
  metodo_calc_roteado?: string | null;
  modo_aplicacao?: string | null;
  profundidade_cm?: number | null;

  // Adubacao
  cultura?: string;
  sistema_cultivo?: string;
  recomendacao_json?: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SISTEMA_LABEL: Record<string, string> = {
  CONVENCIONAL: 'Convencional',
  PD_IMPLANTACAO: 'PD Implantação',
  PD_CONSOLIDADO: 'PD Consolidado',
};

const SISTEMA_COLOR: Record<string, string> = {
  CONVENCIONAL:  'bg-stone-100 text-stone-600',
  PD_IMPLANTACAO: 'bg-blue-100 text-blue-700',
  PD_CONSOLIDADO: 'bg-green-100 text-green-700',
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

const POR_PAGINA = 10;

export function HistoricoAnalisesPage() {
  const [analises, setAnalises] = useState<AnaliseResumo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState<string | null>(null);
  const [busca, setBusca]       = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CALAGEM' | 'ADUBACAO'>('TODOS');
  const [pagina, setPagina]     = useState(1);
  const [ordenacao, setOrdenacao] = useState<{ campo: keyof AnaliseResumo; dir: 'asc' | 'desc' }>({
    campo: 'criado_em',
    dir: 'desc',
  });
  const [selectedAnalise, setSelectedAnalise] = useState<AnaliseResumo | null>(null);

  useEffect(() => {
    api.get('/analises/historico')
      .then((res) => setAnalises(res.data.dados ?? []))
      .catch(() => setErro('Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Filtro + ordenação ───────────────────────────────────────────────────
  const filtradas = analises.filter((a) => {
    const termo = busca.toLowerCase();
    const matchesSearch = 
      a.cidade?.toLowerCase().includes(termo) ||
      a.uf?.toLowerCase().includes(termo) ||
      (a.identificacao ?? '').toLowerCase().includes(termo) ||
      (a.sistema_manejo && SISTEMA_LABEL[a.sistema_manejo]?.toLowerCase().includes(termo)) ||
      (a.cultura ?? '').toLowerCase().includes(termo) ||
      (a.sistema_cultivo ?? '').toLowerCase().includes(termo);

    const matchesTipo = filtroTipo === 'TODOS' || a.tipo === filtroTipo;

    return matchesSearch && matchesTipo;
  });

  const ordenadas = [...filtradas].sort((a, b) => {
    const av = a[ordenacao.campo] ?? '';
    const bv = b[ordenacao.campo] ?? '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return ordenacao.dir === 'asc' ? cmp : -cmp;
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const slice        = ordenadas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function alternarOrdem(campo: keyof AnaliseResumo) {
    setOrdenacao((prev) =>
      prev.campo === campo
        ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { campo, dir: 'asc' }
    );
    setPagina(1);
  }

  function ThOrdenavel({ campo, children }: { campo: keyof AnaliseResumo; children: React.ReactNode }) {
    const ativo = ordenacao.campo === campo;
    return (
      <th
        onClick={() => alternarOrdem(campo)}
        className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-stone-700"
      >
        <span className="flex items-center gap-1">
          {children}
          <ArrowUpDown size={11} className={ativo ? 'text-green-600' : 'text-stone-300'} />
        </span>
      </th>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow">
            <FlaskConical size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-800">Histórico de Análises</h1>
            <p className="text-xs text-stone-400">
              {loading ? 'Carregando...' : `${filtradas.length} registro${filtradas.length !== 1 ? 's' : ''} encontrado${filtradas.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtros Rápidos */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            {(['TODOS', 'CALAGEM', 'ADUBACAO'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFiltroTipo(f); setPagina(1); }}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
                  filtroTipo === f 
                    ? 'bg-white text-green-700 shadow-sm' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por cidade, talhão..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-stone-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Carregando análises...</span>
          </div>
        ) : erro ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-red-400">
            <XCircle size={32} />
            <p className="text-sm">{erro}</p>
          </div>
        ) : slice.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-stone-300">
            <FlaskConical size={32} />
            <p className="text-sm">Nenhuma análise encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-100 bg-stone-50">
                <tr>
                  <ThOrdenavel campo="criado_em">Data</ThOrdenavel>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Tipo</th>
                  <ThOrdenavel campo="cidade">Localização</ThOrdenavel>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Talhão</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Sistema / Cultura</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">pH / SMP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Recomendação</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {slice.map((a) => (
                  <tr 
                    key={a.id} 
                    onClick={() => setSelectedAnalise(a)}
                    className="transition-colors hover:bg-stone-50/70 cursor-pointer"
                  >

                    {/* Data */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                      {formatarData(a.criado_em)}
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3">
                      {a.tipo === 'CALAGEM' ? (
                        <span className="rounded-full bg-green-100 text-green-700 px-2 py-1 text-[10px] font-bold uppercase">Calagem</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-bold uppercase">Adubação</span>
                      )}
                    </td>

                    {/* Localização */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-stone-700">
                        <MapPin size={12} className="shrink-0 text-stone-400" />
                        {a.cidade} — {a.uf}
                      </span>
                    </td>

                    {/* Talhão */}
                    <td className="px-4 py-3 text-stone-500">
                      {a.identificacao ?? <span className="text-stone-300">—</span>}
                    </td>

                    {/* Sistema / Cultura */}
                    <td className="px-4 py-3">
                      {a.tipo === 'CALAGEM' && a.sistema_manejo ? (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${SISTEMA_COLOR[a.sistema_manejo] || 'bg-stone-100'}`}>
                          {SISTEMA_LABEL[a.sistema_manejo] || a.sistema_manejo}
                        </span>
                      ) : a.tipo === 'ADUBACAO' ? (
                        <span className="text-stone-700 font-medium text-xs">
                          {a.cultura?.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* pH / SMP */}
                    <td className="px-4 py-3 text-stone-700">
                      {a.pH_agua != null ? (
                        <>
                          <span className="font-medium">{a.pH_agua?.toFixed(1)}</span>
                          {a.tipo === 'CALAGEM' && a.SMP != null && (
                            <>
                              <span className="mx-1 text-stone-300">/</span>
                              <span className="text-stone-500">{a.SMP?.toFixed(1)}</span>
                            </>
                          )}
                        </>
                      ) : (
                         <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* Recomendação */}
                    <td className="px-4 py-3">
                      {a.tipo === 'CALAGEM' ? (
                        a.NC_ajustada != null ? (
                          <span className="font-bold text-green-700">
                            {a.NC_ajustada.toFixed(2)}
                            <span className="ml-1 text-xs font-normal text-green-500">t/ha</span>
                          </span>
                        ) : <span className="text-stone-300">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-stone-500">
                            P₂O₅: <strong className="text-stone-700">{a.recomendacao_json?.recomendacao?.p2o5?.dose_total_kg_ha ?? 0}</strong> kg/ha
                          </span>
                          <span className="text-[10px] text-stone-500">
                            K₂O: <strong className="text-stone-700">{a.recomendacao_json?.recomendacao?.k2o?.dose_total_kg_ha ?? 0}</strong> kg/ha
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Detalhes / Resultado (Ex: Aplicar ou método) */}
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {a.tipo === 'CALAGEM' ? (
                        a.aplicar_calcario === true ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 size={12} /> Aplicar
                          </span>
                        ) : a.aplicar_calcario === false ? (
                          <span className="flex items-center gap-1 text-stone-400">
                            <XCircle size={12} /> Não aplicar
                          </span>
                        ) : '—'
                      ) : (
                        <span className="text-[10px] uppercase text-stone-400">{a.sistema_cultivo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {!loading && !erro && totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-400">
            Página {paginaAtual} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      <ModalDetalhesAnalise 
        analise={selectedAnalise as any} 
        onClose={() => setSelectedAnalise(null)} 
      />
    </div>
  );
}