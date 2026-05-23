import { useEffect, useState } from 'react';
import {
  FlaskConical,
  Search,
  MapPin,
  Calendar,
  User,
  UserCheck,
  MousePointer2,
  Loader2,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { ModalDetalhesAnalise } from '../components/ModalDetalhesAnalise';

interface GlobalAnalise {
  id: string;
  criado_em: string;
  uf: string;
  cidade: string;
  identificacao: string | null;
  sistema_manejo: string;
  primeira_calagem: boolean;
  PRNT: number;
  pH_agua: number;
  SMP: number;
  MO?: number | null;
  Al_trocavel?: number | null;
  V_atual?: number | null;
  CTC_pH7?: number | null;
  Al_sat?: number | null;
  NC_ajustada: number | null;
  metodo_calc_roteado: string | null;
  modo_aplicacao: string | null;
  profundidade_cm: number | null;
  alertas?: string[] | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
}

export function AdminAnalisesPage() {
  const [analises, setAnalises] = useState<GlobalAnalise[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'TODAS' | 'LOGADOS' | 'CONVIDADOS'>('TODAS');
  const [selectedAnalise, setSelectedAnalise] = useState<GlobalAnalise | null>(null);

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
    
    const matchesFilter = 
      filtro === 'TODAS' || 
      (filtro === 'LOGADOS' && a.usuario_id !== null) || 
      (filtro === 'CONVIDADOS' && a.usuario_id === null);

    return matchesSearch && matchesFilter;
  });

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
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            {(['TODAS', 'LOGADOS', 'CONVIDADOS'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
                  filtro === f 
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

      {/* Grid de Amostras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAnalises.map((a) => (
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
              <div className="flex flex-col">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Sistema</span>
                <span className="text-[10px] font-semibold text-stone-600 uppercase">{a.sistema_manejo.replace('_', ' ')}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Dose NC</span>
                <span className="text-lg font-black text-green-700">
                  {a.NC_ajustada?.toFixed(2) || '0.00'}
                  <span className="text-[10px] font-normal text-green-500 ml-0.5">t/ha</span>
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>

      {filteredAnalises.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 p-20 text-center">
          <FlaskConical className="mx-auto h-12 w-12 text-stone-200 mb-4" />
          <p className="text-stone-400 font-medium">Nenhuma amostra encontrada com estes filtros.</p>
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
