import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  FlaskConical, 
  History, 
  Info, 
  Tractor,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sprout
} from 'lucide-react';
import { getTalhao, api } from '../services/api';
import { ModalDetalhesAnalise } from '../components/ModalDetalhesAnalise';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnaliseCompleta {
  id: string;
  criado_em: string;
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
  alertas?: string[] | null;

  // Adubacao
  cultura?: string;
  sistema_cultivo?: string;
  recomendacao_json?: any;
}

interface TalhaoInfo {
  id: string;
  nome: string;
  cultura: string;
}

const SISTEMA_LABEL: Record<string, string> = {
  CONVENCIONAL: 'Convencional',
  PD_IMPLANTACAO: 'PD Implantação',
  PD_CONSOLIDADO: 'PD Consolidado',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TalhaoDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [talhao, setTalhao] = useState<TalhaoInfo | null>(null);
  const [analises, setAnalises] = useState<AnaliseCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CALAGEM' | 'ADUBACAO'>('TODOS');
  const [selectedAnalise, setSelectedAnalise] = useState<AnaliseCompleta | null>(null);

  useEffect(() => {
    if (!id) return;
    
    Promise.all([
      getTalhao(id),
      api.get('/analises/historico')
    ])
    .then(([talhaoData, analisesRes]) => {
      setTalhao(talhaoData);
      const historicoCompleto = analisesRes.data.dados ?? [];
      const apenasTalhao = historicoCompleto.filter((a: any) => a.talhao_id === id);
      setAnalises(apenasTalhao);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-green-600" />
      </div>
    );
  }

  if (!talhao) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20">
        <AlertCircle size={48} className="text-red-400" />
        <h2 className="text-xl font-bold text-stone-800">Talhão não encontrado</h2>
        <button onClick={() => navigate('/dashboard')} className="text-green-600 font-bold hover:underline">
          Voltar para Propriedades
        </button>
      </div>
    );
  }

  const filtradas = analises.filter(a => filtroTipo === 'TODOS' || a.tipo === filtroTipo);

  return (
    <div className="w-full max-w-6xl space-y-8 pb-20 mx-auto">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Tractor className="text-green-600" size={24} />
              <h2 className="text-3xl font-bold text-stone-800">{talhao.nome}</h2>
            </div>
            <p className="text-stone-500">Cultura Atual: <span className="font-semibold text-stone-700">{talhao.cultura}</span></p>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/dashboard/nova-analise', { state: { talhaoId: talhao.id } })}
          className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-stone-800"
        >
          <FlaskConical size={18} /> Inserção Rápida no Talhão
        </button>
      </div>

      {/* Tabela de Amostras / Histórico */}
      <div className="space-y-4">
        
        {/* Controles de Filtro */}
        <div className="flex items-center justify-between px-2 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-stone-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Histórico de Amostras</h3>
            <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{filtradas.length}</span>
          </div>

          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            {(['TODOS', 'CALAGEM', 'ADUBACAO'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroTipo(f)}
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
        </div>

        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-stone-100 bg-stone-50/50 py-20 text-stone-400">
            <FlaskConical size={40} className="mb-4 opacity-20" />
            <p>Nenhuma análise encontrada para este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtradas.map((a) => (
              <div 
                key={a.id} 
                className="overflow-hidden rounded-2xl border border-stone-200 bg-white transition-all hover:shadow-md cursor-pointer group"
                onClick={() => setSelectedAnalise(a)}
              >
                <div className="flex flex-col md:flex-row md:items-stretch">
                  {/* Status do diagnóstico */}
                  <div className={`flex w-full flex-col justify-center p-6 text-center md:w-48 ${
                    a.tipo === 'CALAGEM' ? (a.aplicar_calcario ? 'bg-green-50' : 'bg-stone-50') : 'bg-emerald-50'
                  } group-hover:opacity-90 transition-opacity`}>
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      {a.tipo === 'CALAGEM' ? (
                        a.aplicar_calcario ? <TrendingUp size={20} className="text-green-600" /> : <CheckCircle2 size={20} className="text-stone-400" />
                      ) : (
                        <Sprout size={20} className="text-emerald-600" />
                      )}
                    </div>
                    
                    {a.tipo === 'CALAGEM' ? (
                      <>
                        <span className={`text-xs font-bold uppercase tracking-wider ${a.aplicar_calcario ? 'text-green-700' : 'text-stone-500'}`}>
                          {a.aplicar_calcario ? 'Recomendado' : 'Equilibrado'}
                        </span>
                        {a.aplicar_calcario && (
                          <div className="mt-1">
                            <span className="text-2xl font-black text-green-700">{a.NC_ajustada?.toFixed(2)}</span>
                            <span className="text-[10px] font-bold text-green-600 ml-1">t/ha</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Adubação</span>
                        <div className="mt-1">
                          <span className="text-sm font-bold text-emerald-600">{a.cultura?.replace('_', ' ')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Detalhes da Amostra */}
                  <div className="flex-1 p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
                      <div>
                        <h4 className="font-bold text-stone-800">{a.identificacao || 'Amostra sem identificação'}</h4>
                        <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(a.criado_em).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Info size={12} /> {a.tipo === 'CALAGEM' ? (SISTEMA_LABEL[a.sistema_manejo || ''] || a.sistema_manejo) : a.sistema_cultivo}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                         {a.tipo === 'CALAGEM' ? (
                           <>
                             {a.pH_agua != null && (
                               <span className="rounded-lg bg-stone-100 px-3 py-1 text-[10px] font-bold text-stone-600">
                                 pH: {a.pH_agua?.toFixed(1)}
                               </span>
                             )}
                             {a.SMP != null && (
                               <span className="rounded-lg bg-stone-100 px-3 py-1 text-[10px] font-bold text-stone-600">
                                 SMP: {a.SMP?.toFixed(1)}
                               </span>
                             )}
                           </>
                         ) : (
                           <>
                              {a.pH_agua != null && (
                               <span className="rounded-lg bg-stone-100 px-3 py-1 text-[10px] font-bold text-stone-600">
                                 pH: {a.pH_agua?.toFixed(1)}
                               </span>
                             )}
                           </>
                         )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {a.tipo === 'CALAGEM' ? (
                        <>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-stone-400">Método Utilizado</p>
                             <p className="text-sm font-semibold text-stone-700">{a.metodo_calc_roteado || '—'}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-stone-400">Modo de Aplicação</p>
                             <p className="text-sm font-semibold text-stone-700">{a.modo_aplicacao || '—'}</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-stone-400">Profundidade</p>
                             <p className="text-sm font-semibold text-stone-700">{a.profundidade_cm ? `${a.profundidade_cm} cm` : '—'}</p>
                          </div>
                          <div className="space-y-1 text-right">
                             <p className="text-[10px] font-bold uppercase text-stone-400">PRNT</p>
                             <p className="text-sm font-semibold text-stone-700">{a.PRNT}%</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-stone-400">P₂O₅ Recomendado</p>
                             <p className="text-sm font-semibold text-stone-700">{a.recomendacao_json?.recomendacao?.p2o5?.dose_total_kg_ha ?? 0} kg/ha</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-stone-400">K₂O Recomendado</p>
                             <p className="text-sm font-semibold text-stone-700">{a.recomendacao_json?.recomendacao?.k2o?.dose_total_kg_ha ?? 0} kg/ha</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold uppercase text-stone-400">S Recomendado</p>
                             <p className="text-sm font-semibold text-stone-700">{a.recomendacao_json?.recomendacao?.s?.dose_kg_ha ?? 0} kg/ha</p>
                          </div>
                          <div className="space-y-1 text-right flex flex-col justify-end">
                             <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">Ver Relatório <ArrowLeft size={12} className="rotate-180" /></p>
                          </div>
                        </>
                      )}
                    </div>

                    {a.alertas && a.alertas.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {a.alertas.map((alerta, i) => (
                          <div key={i} className="flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700 border border-orange-100">
                            <AlertCircle size={10} /> {alerta}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAnalise && (
        <ModalDetalhesAnalise
          analise={selectedAnalise as any}
          onClose={() => setSelectedAnalise(null)}
        />
      )}
    </div>
  );
}
