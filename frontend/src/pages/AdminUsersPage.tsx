import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  MapPin,
  Calendar,
  FlaskConical,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Warehouse,
  Grid3X3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../services/api';
import { ModalDetalhesAnalise } from '../components/ModalDetalhesAnalise';

interface UserItem {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  cidade: string;
  estado: string;
  role: string;
  createdAt: string;
  totalAnalises: number;
}

interface Fazenda {
  id: string;
  nome: string;
  municipio: string;
  uf: string;
}

interface Talhao {
  id: string;
  fazenda_id: string;
  nome: string;
  cultura: string;
}

interface UserAnalise {
  id: string;
  talhao_id: string | null;
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
}

interface UserFullData {
  fazendas: Fazenda[];
  talhoes: Talhao[];
  analises: UserAnalise[];
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [fullData, setFullData] = useState<UserFullData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedFazenda, setExpandedFazenda] = useState<string | null>(null);
  const [selectedAnalise, setSelectedAnalise] = useState<any | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleSelectUser = (user: UserItem) => {
    setSelectedUser(user);
    setLoadingDetails(true);
    api.get(`/admin/users/${user.id}/full-details`)
      .then((res) => {
        setFullData(res.data);
        setExpandedFazenda(null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingDetails(false));
  };

  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(busca.toLowerCase()) || 
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    u.cpf.includes(busca)
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      
      {selectedUser ? (
        // ── User Detailed View ──────────────────────────────────────────
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          <button 
            onClick={() => { setSelectedUser(null); setFullData(null); }}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Voltar para lista</span>
          </button>

          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
                  <Users className="text-stone-400 h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-stone-800">{selectedUser.nome}</h1>
                  <p className="text-stone-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl bg-stone-50 px-4 py-2 border border-stone-100">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Cidade</p>
                  <p className="text-sm font-semibold text-stone-700">{selectedUser.cidade} - {selectedUser.estado}</p>
                </div>
                <div className="rounded-xl bg-green-50 px-4 py-2 border border-green-100">
                  <p className="text-[10px] uppercase font-bold text-green-400">Total Análises</p>
                  <p className="text-sm font-bold text-green-700">{selectedUser.totalAnalises}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
              <Warehouse size={20} className="text-green-600" />
              Fazendas e Talhões
            </h2>

            {loadingDetails ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : !fullData || fullData.fazendas.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-stone-200 p-12 text-center text-stone-400 bg-white">
                Este usuário ainda não possui fazendas cadastradas.
              </div>
            ) : (
              <div className="space-y-4">
                {fullData.fazendas.map(fazenda => {
                  const isExpanded = expandedFazenda === fazenda.id;
                  const talhoesFazenda = fullData.talhoes.filter(t => t.fazenda_id === fazenda.id);
                  
                  return (
                    <div key={fazenda.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                      <button 
                        onClick={() => setExpandedFazenda(isExpanded ? null : fazenda.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="p-2 bg-stone-100 rounded-lg">
                            <Warehouse size={18} className="text-stone-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-stone-800">{fazenda.nome}</h3>
                            <p className="text-xs text-stone-400 flex items-center gap-1">
                              <MapPin size={12} /> {fazenda.municipio} - {fazenda.uf}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2 py-1 rounded-md">
                            {talhoesFazenda.length} Talhões
                          </span>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-stone-50/50 p-5 border-t border-stone-100 space-y-4">
                          {talhoesFazenda.length === 0 ? (
                            <p className="text-sm text-stone-400 text-center py-4">Nenhum talhão nesta fazenda.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {talhoesFazenda.map(talhao => {
                                const analisesTalhao = fullData.analises.filter(a => a.talhao_id === talhao.id);
                                return (
                                  <div key={talhao.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Grid3X3 size={16} className="text-green-500" />
                                      <h4 className="font-bold text-stone-700">{talhao.nome}</h4>
                                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                        {talhao.cultura}
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {analisesTalhao.length === 0 ? (
                                        <p className="text-[10px] text-stone-300 italic">Sem análises para este talhão.</p>
                                      ) : (
                                        analisesTalhao.map(a => (
                                          <div 
                                            key={a.id} 
                                            onClick={() => setSelectedAnalise({...a, usuario_nome: selectedUser.nome, usuario_email: selectedUser.email})}
                                            className="flex items-center justify-between text-xs py-1.5 border-b border-stone-50 last:border-0 hover:bg-green-50 px-2 rounded-lg cursor-pointer transition-colors"
                                          >
                                            <span className="text-stone-500">{new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
                                            <span className="font-bold text-green-700">{a.NC_ajustada?.toFixed(2) || '0.00'} t/ha</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Análises Soltas (sem talhão) */}
            {fullData && fullData.analises.some(a => !a.talhao_id) && (
              <div className="mt-8 space-y-4">
                <h3 className="text-md font-bold text-stone-600 flex items-center gap-2">
                  <FlaskConical size={18} />
                  Análises Avulsas (Sem Talhão)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {fullData.analises.filter(a => !a.talhao_id).map(a => (
                    <div 
                      key={a.id} 
                      onClick={() => setSelectedAnalise({...a, usuario_nome: selectedUser.nome, usuario_email: selectedUser.email})}
                      className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:border-green-300 cursor-pointer transition-all"
                    >
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-stone-400 font-bold">{new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
                          <span className="text-[10px] text-green-600 font-bold uppercase">{a.sistema_manejo}</span>
                       </div>
                       <p className="font-bold text-stone-700 text-sm truncate">{a.identificacao || 'Sem Identificação'}</p>
                       <p className="text-[10px] text-stone-400">{a.cidade} - {a.uf}</p>
                       <div className="mt-2 pt-2 border-t border-stone-50 text-right">
                          <span className="font-bold text-green-700 text-xs">{a.NC_ajustada?.toFixed(2) || '0.00'} t/ha</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ── Users List View ────────────────────────────────────────────
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">Base de Produtores</h1>
              <p className="text-stone-500">Gestão centralizada de usuários e seus dados agronômicos.</p>
            </div>
            
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                type="text" 
                placeholder="Nome, e-mail ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-100 bg-stone-50/50 text-stone-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Produtor</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Cidade/Estado</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Amostras</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Cadastro</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => handleSelectUser(user)}
                      className="hover:bg-green-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-stone-800">{user.nome}</p>
                            <p className="text-xs text-stone-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-stone-600">
                        <div className="flex items-center gap-1 font-medium">
                          <MapPin size={14} className="text-stone-300" />
                          {user.cidade} / {user.estado}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-green-50 text-green-700 font-bold border border-green-100">
                          {user.totalAnalises}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-stone-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="inline-block text-stone-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all" size={20} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Amostra */}
      <ModalDetalhesAnalise 
        analise={selectedAnalise} 
        onClose={() => setSelectedAnalise(null)} 
      />
    </div>
  );
}
