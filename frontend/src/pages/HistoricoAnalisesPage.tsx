import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  MapPin,
  Pencil,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api, arquivarAnaliseSalva, excluirAnaliseSalva } from '../services/api';
import { ModalDetalhesAnalise } from '../components/ModalDetalhesAnalise';
import { rotuloSistemaManejo } from '../constants/sistemaManejo';
import { formatarDataAnalise, formatarDataInsercao } from '../utils/datas';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnaliseResumo {
  id: string;
  criado_em: string;
  data_analise?: string | null;
  // data_analise quando informada, senão a de inserção — usada para ordenar
  data_referencia?: string;
  uf: string;
  cidade: string;
  identificacao: string | null;
  talhao_nome?: string | null;
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
  recomendacao_json?: {
    recomendacao?: { p2o5?: { dose_total_kg_ha?: number }; k2o?: { dose_total_kg_ha?: number } };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────


const SISTEMA_COLOR: Record<string, string> = {
  CONVENCIONAL:  'bg-stone-100 text-stone-600',
  PD_IMPLANTACAO: 'bg-blue-100 text-blue-700',
  PD_CONSOLIDADO: 'bg-green-100 text-green-700',
};


function ThOrdenavel({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <th
      onClick={onClick}
      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-stone-700"
    >
      <span className="flex items-center gap-1">
        {children}
        <ArrowUpDown size={11} className={ativo ? 'text-green-600' : 'text-stone-300'} />
      </span>
    </th>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const POR_PAGINA = 10;

export function HistoricoAnalisesPage() {
  const navigate = useNavigate();
  // ?arquivadas=1 → área de análises arquivadas (mesma tabela, outras ações)
  const [searchParams, setSearchParams] = useSearchParams();
  const verArquivadas = searchParams.get('arquivadas') === '1';
  const [carregado, setCarregado] = useState<{ chave: string; analises: AnaliseResumo[]; erro: string | null } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [operando, setOperando] = useState<string | null>(null);
  const [busca, setBusca]       = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CALAGEM' | 'ADUBACAO'>('TODOS');
  const [pagina, setPagina]     = useState(1);
  const [ordenacao, setOrdenacao] = useState<{ campo: keyof AnaliseResumo; dir: 'asc' | 'desc' }>({
    campo: 'data_referencia',
    dir: 'desc',
  });
  const [selectedAnalise, setSelectedAnalise] = useState<AnaliseResumo | null>(null);

  const chave = verArquivadas ? 'arquivadas' : 'ativas';
  useEffect(() => {
    let ativo = true;
    api.get('/analises/historico', { params: verArquivadas ? { arquivadas: 'true' } : undefined })
      .then((res) => {
        if (!ativo) return;
        const lista: AnaliseResumo[] = (res.data.dados ?? []).map((a: AnaliseResumo) => ({
          ...a,
          data_referencia: a.data_analise ?? a.criado_em,
        }));
        setCarregado({ chave, analises: lista, erro: null });
      })
      .catch(() => { if (ativo) setCarregado({ chave, analises: [], erro: 'Não foi possível carregar o histórico.' }); });
    return () => { ativo = false; };
  }, [chave, verArquivadas]);

  const loading = carregado?.chave !== chave;
  const analises = loading ? [] : carregado.analises;
  const erro = loading ? null : carregado.erro;

  const trocarArea = (arquivadas: boolean) => {
    setSearchParams(arquivadas ? { arquivadas: '1' } : {});
    setPagina(1);
    setAviso(null);
  };

  // Tira a análise da lista atual (após excluir, arquivar ou restaurar)
  const removerDaLista = (id: string) => {
    setCarregado((prev) => (prev ? { ...prev, analises: prev.analises.filter((a) => a.id !== id) } : prev));
  };

  const editar = (a: AnaliseResumo) => {
    navigate(`/historico/editar/${a.tipo === 'CALAGEM' ? 'calagem' : 'adubacao'}/${a.id}`);
  };

  const alternarArquivo = async (a: AnaliseResumo) => {
    setOperando(a.id);
    try {
      await arquivarAnaliseSalva(a.tipo, a.id, !verArquivadas);
      removerDaLista(a.id);
      setAviso(verArquivadas ? 'Análise restaurada para o histórico.' : 'Análise arquivada. Ela continua disponível em "Arquivadas".');
    } catch {
      setAviso('Não foi possível concluir. Tente novamente.');
    } finally {
      setOperando(null);
    }
  };

  const excluir = async (a: AnaliseResumo) => {
    const ok = confirm(
      'Excluir esta análise definitivamente?\n\nEssa ação não pode ser desfeita. Se quiser só tirar da lista, use "Arquivar".'
    );
    if (!ok) return;
    setOperando(a.id);
    try {
      await excluirAnaliseSalva(a.tipo, a.id);
      removerDaLista(a.id);
      setAviso('Análise excluída.');
    } catch {
      setAviso('Não foi possível excluir. Tente novamente.');
    } finally {
      setOperando(null);
    }
  };

  // ── Filtro + ordenação ───────────────────────────────────────────────────
  const filtradas = analises.filter((a) => {
    const termo = busca.toLowerCase();
    const matchesSearch = 
      a.cidade?.toLowerCase().includes(termo) ||
      a.uf?.toLowerCase().includes(termo) ||
      (a.identificacao ?? '').toLowerCase().includes(termo) ||
      (a.talhao_nome ?? '').toLowerCase().includes(termo) ||
      (a.sistema_manejo && rotuloSistemaManejo(a.sistema_manejo).toLowerCase().includes(termo)) ||
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
            <h1 className="text-xl font-bold text-stone-800">{verArquivadas ? 'Análises Arquivadas' : 'Histórico de Análises'}</h1>
            <p className="text-xs text-stone-400">
              {loading ? 'Carregando...' : `${filtradas.length} registro${filtradas.length !== 1 ? 's' : ''} encontrado${filtradas.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Ativas × Arquivadas */}
          <div className="flex rounded-xl border border-stone-200 bg-stone-100 p-1">
            {[
              { arquivadas: false, rotulo: 'Ativas' },
              { arquivadas: true, rotulo: 'Arquivadas' },
            ].map(({ arquivadas, rotulo }) => (
              <button
                key={rotulo}
                onClick={() => trocarArea(arquivadas)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  verArquivadas === arquivadas ? 'bg-white text-green-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {arquivadas ? <Archive size={11} /> : null}
                {rotulo}
              </button>
            ))}
          </div>

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

      {aviso ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm">
          <span>{aviso}</span>
          <button onClick={() => setAviso(null)} className="text-xs font-bold text-stone-400 hover:text-stone-600">Fechar</button>
        </div>
      ) : null}

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
            <p className="text-sm">{verArquivadas ? 'Nenhuma análise arquivada.' : 'Nenhuma análise encontrada.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-100 bg-stone-50">
                <tr>
                  <ThOrdenavel ativo={ordenacao.campo === 'data_referencia'} onClick={() => alternarOrdem('data_referencia')}>Data da análise</ThOrdenavel>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Tipo</th>
                  <ThOrdenavel ativo={ordenacao.campo === 'cidade'} onClick={() => alternarOrdem('cidade')}>Localização</ThOrdenavel>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Talhão</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Sistema / Cultura</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">pH / SMP</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Recomendação</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Ações</th>
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
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {formatarDataAnalise(a.data_analise) ? (
                        <span className="font-semibold text-stone-700">{formatarDataAnalise(a.data_analise)}</span>
                      ) : (
                        <span className="italic text-stone-400">Não informada</span>
                      )}
                      <span className="block text-[10px] text-stone-400">inserida em {formatarDataInsercao(a.criado_em)}</span>
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
                      {a.talhao_nome ? (
                        <span className="font-medium text-stone-700">{a.talhao_nome}</span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                      {a.identificacao ? (
                        <span className="block text-[11px] text-stone-400">{a.identificacao}</span>
                      ) : null}
                    </td>

                    {/* Sistema / Cultura */}
                    <td className="px-4 py-3">
                      {a.tipo === 'CALAGEM' && a.sistema_manejo ? (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${SISTEMA_COLOR[a.sistema_manejo] || 'bg-stone-100'}`}>
                          {rotuloSistemaManejo(a.sistema_manejo)}
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
                        a.aplicar_calcario === false ? (
                          <span className="flex items-center gap-1 text-xs text-stone-400">
                            <XCircle size={12} /> Não aplicar
                          </span>
                        ) : a.NC_ajustada != null ? (
                          <span className="flex items-center gap-1 font-bold text-green-700">
                            <CheckCircle2 size={12} className="text-green-500" />
                            {a.NC_ajustada.toFixed(2)}
                            <span className="text-xs font-normal text-green-500">t/ha</span>
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

                    {/* Ações: editar, arquivar/restaurar, excluir (clicar na linha abre os detalhes) */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => editar(a)}
                          disabled={operando === a.id}
                          title="Editar análise"
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40"
                        >
                          <Pencil size={13} /> Editar
                        </button>
                        <button
                          onClick={() => alternarArquivo(a)}
                          disabled={operando === a.id}
                          title={verArquivadas ? 'Restaurar para o histórico' : 'Arquivar (não apaga nada)'}
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-40"
                        >
                          {verArquivadas ? <><ArchiveRestore size={13} /> Restaurar</> : <><Archive size={13} /> Arquivar</>}
                        </button>
                        <button
                          onClick={() => excluir(a)}
                          disabled={operando === a.id}
                          title="Excluir definitivamente"
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 size={13} /> Excluir
                        </button>
                      </div>
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