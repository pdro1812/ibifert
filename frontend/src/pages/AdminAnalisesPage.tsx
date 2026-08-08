import { useEffect, useState } from 'react';
import {
  FlaskConical,
  Search,
  MapPin,
  UserCheck,
  MousePointer2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { ModalDetalhesAnalise } from '../components/ModalDetalhesAnalise';

interface GlobalAnalise {
  id: string;
  criado_em: string;
  uf: string;
  cidade: string;
  identificacao: string | null;
  tipo: 'CALAGEM' | 'ADUBACAO';
  
  // Específicos de Calagem
  sistema_manejo?: string;
  primeira_calagem?: boolean;
  PRNT?: number;
  NC_ajustada?: number | null;
  metodo_calc_roteado?: string | null;
  modo_aplicacao?: string | null;
  profundidade_cm?: number | null;
  
  // Específicos de Adubação
  cultura?: string;
  sistema_cultivo?: string;
  recomendacao_json?: any;

  // Comuns
  pH_agua?: number;
  SMP?: number;
  MO?: number | null;
  Al_trocavel?: number | null;
  V_atual?: number | null;
  CTC_pH7?: number | null;
  Al_sat?: number | null;
  alertas?: string[] | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
}

export function AdminAnalisesPage() {
  const [analises, setAnalises] = useState<GlobalAnalise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUser, setFiltroUser] = useState<'TODAS' | 'LOGADOS' | 'CONVIDADOS'>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CALAGEM' | 'ADUBACAO'>('TODOS');
  const [selectedAnalise, setSelectedAnalise] = useState<GlobalAnalise | null>(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    api.get('/admin/analises')
      .then((res) => setAnalises(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredAnalises = analises.filter(a => {
    const matchesSearch = 
      a.cidade.toLowerCase().includes(busca.toLowerCase()) || 
      (a.usuario_nome ?? '').toLowerCase().includes(busca.toLowerCase()) ||
      (a.identificacao ?? '').toLowerCase().includes(busca.toLowerCase());
    
    const matchesUser = 
      filtroUser === 'TODAS' || 
      (filtroUser === 'LOGADOS' && a.usuario_id !== null) || 
      (filtroUser === 'CONVIDADOS' && a.usuario_id === null);

    const matchesTipo = 
      filtroTipo === 'TODOS' || a.tipo === filtroTipo;

    return matchesSearch && matchesUser && matchesTipo;
  });

  // Volta para a página 1 sempre que a busca ou filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [busca, filtroUser, filtroTipo]);

  const totalPages = Math.ceil(filteredAnalises.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAnalises = filteredAnalises.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Monitoramento de Amostras</h1>
          <p className="text-stone-500">Histórico global de cálculos realizados no sistema.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input 
              type="text" 
              placeholder="Cidade, usuário ou talhão..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-green-500 w-64"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex gap-2">
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

            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
              {(['TODAS', 'LOGADOS', 'CONVIDADOS'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroUser(f)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
                    filtroUser === f 
                      ? 'bg-white text-green-700 shadow-sm' 
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Amostras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedAnalises.map((a) => (
          <div 
            key={a.id} 
            onClick={() => setSelectedAnalise(a)}
            className="group relative rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-green-300 transition-all hover:shadow-md cursor-pointer"
          >
            
            {/* Badge de Usuário/Convidado */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${a.usuario_id ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {a.usuario_id ? <UserCheck size={14} /> : <MousePointer2 size={14} />}
                </div>
                <span className={`text-[10px] font-bold uppercase ${a.usuario_id ? 'text-blue-600' : 'text-amber-600'}`}>
                  {a.usuario_id ? 'Usuário Logado' : 'Modo Convidado'}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium">
                {new Date(a.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>

            {/* Informações da Amostra */}
            <div className="space-y-1">
              <h3 className="font-bold text-stone-800 truncate">
                {a.identificacao || 'Amostra Rápida'}
              </h3>
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <MapPin size={12} className="text-stone-300" />
                {a.cidade} - {a.uf}
              </div>
            </div>

            {/* Dados do Usuário (se houver) */}
            {a.usuario_id && (
              <div className="mt-4 p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2">
                   <div className="h-6 w-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-500">
                      {a.usuario_nome?.charAt(0)}
                   </div>
                   <div className="min-w-0">
                      <p className="text-[10px] font-bold text-stone-700 truncate">{a.usuario_nome}</p>
                      <p className="text-[9px] text-stone-400 truncate">{a.usuario_email}</p>
                   </div>
                </div>
              </div>
            )}

            {/* Resultado Final */}
            <div className="mt-4 pt-4 border-t border-stone-50 flex items-center justify-between">
              {a.tipo === 'CALAGEM' ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Sistema</span>
                    <span className="text-[10px] font-semibold text-stone-600 uppercase">
                      {a.sistema_manejo?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Dose NC</span>
                    <span className="text-lg font-black text-green-700">
                      {a.NC_ajustada?.toFixed(2) || '0.00'}
                      <span className="text-[10px] font-normal text-green-500 ml-0.5">t/ha</span>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Cultura</span>
                    <span className="text-[10px] font-semibold text-stone-600 uppercase">
                      {a.cultura?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Tipo</span>
                    <span className="text-sm font-black text-emerald-700">
                      ADUBAÇÃO
                    </span>
                  </div>
                </>
              )}
            </div>

          </div>
        ))}
      </div>

      {paginatedAnalises.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 p-20 text-center">
          <FlaskConical className="mx-auto h-12 w-12 text-stone-200 mb-4" />
          <p className="text-stone-400 font-medium">Nenhuma amostra encontrada com estes filtros.</p>
        </div>
      )}

      {/* Paginação */}
      {filteredAnalises.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span>Exibir</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 outline-none focus:border-green-500 text-stone-700"
            >
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
            <span>por página</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            
            <span className="text-sm text-stone-600 font-medium px-2">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      <ModalDetalhesAnalise 
        analise={selectedAnalise} 
        onClose={() => setSelectedAnalise(null)} 
      />

    </div>
  );
}
