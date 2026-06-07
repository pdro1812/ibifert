import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FlaskConical,
  MousePointer2,
  TrendingUp,
  Map,
  Settings,
  Loader2,
  UserPlus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  usuarios: {
    total: number;
    recentes: Array<{
      id: string;
      nome: string;
      email: string;
      createdAt: string;
    }>;
  };
  analises: {
    total: number;
    logados: number;
    convidados: number;
    porUF: Array<{ uf: string; quantidade: number }>;
    porSistema: Array<{ sistema: string; quantidade: number }>;
  };
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

// ── Page ─────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Erro ao carregar estatísticas:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!stats) return null;

  const dataPie = stats.analises.porSistema.map(s => ({
    name: s.sistema,
    value: Number(s.quantidade)
  }));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Visão Geral do Sistema</h1>
          <p className="text-stone-500">Métricas globais e monitoramento de atividades.</p>
        </div>
        <div className="rounded-xl bg-white p-2 shadow-sm border border-stone-200">
           <Settings className="text-stone-400 h-5 w-5" />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total de Usuários" 
          value={stats.usuarios.total} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Amostras Totais" 
          value={stats.analises.total} 
          icon={FlaskConical} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Usuários Logados" 
          value={stats.analises.logados} 
          icon={TrendingUp} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Modo Convidado" 
          value={stats.analises.convidados} 
          icon={MousePointer2} 
          color="bg-amber-500" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Bar Chart: Samples by UF */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Map className="h-5 w-5 text-green-600" />
            <h3 className="font-bold text-stone-800">Amostras por Estado</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.analises.porUF}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="uf" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="quantidade" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Systems */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-green-600" />
            <h3 className="font-bold text-stone-800">Sistemas de Manejo</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataPie.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 bg-stone-50/50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-stone-800">Últimos Cadastros</h3>
          </div>
          <button 
            onClick={() => navigate('/admin/usuarios')}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Ver todos
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-100 text-stone-400">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">E-mail</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Data de Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {stats.usuarios.recentes.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-stone-800">{u.nome}</td>
                  <td className="px-6 py-4 text-stone-500">{u.email}</td>
                  <td className="px-6 py-4 text-stone-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-stone-800">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color} shadow-lg shadow-${color.split('-')[1]}-200`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
