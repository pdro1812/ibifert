import { useEffect, useState } from 'react';
import {
  Map,
  TrendingUp,
  FlaskConical,
  Activity,
  AlertCircle,
  Loader2,
  ChevronDown,
  Lightbulb,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RegionalData {
  medias: {
    ph: string;
    nc: string;
    total: number;
    taxa_aplicacao: string;
  };
  sistemas: Array<{ name: string; value: number }>;
  monitoramento: Array<{ label: string; valor: number }>;
  filtros: Array<{ uf: string; cidade: string }>;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

// ── Page ─────────────────────────────────────────────────────────────────────

export function MonitoramentoPage() {
  const [data, setData] = useState<RegionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');

  useEffect(() => {
    fetchStats();
  }, [uf, cidade]);

  const fetchStats = () => {
    setLoading(true);
    api.get('/analises/regional-stats', { params: { uf, cidade } })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const ufsDisponiveis = Array.from(new Set(data?.filtros.map(f => f.uf) || []));
  const cidadesFiltradas = data?.filtros.filter(f => !uf || f.uf === uf).map(f => f.cidade) || [];

  if (loading && !data) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const hasData = data && data.medias.total > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      
      {/* Header e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Map className="text-green-600" />
            Monitoramento Regional
          </h1>
          <p className="text-stone-500 text-sm">Insights agregados da fertilidade do solo em sua região.</p>
        </div>

        {hasData && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
               <select 
                 value={uf} 
                 onChange={(e) => { setUf(e.target.value); setCidade(''); }}
                 className="appearance-none bg-white border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-stone-700 outline-none focus:border-green-500 shadow-sm"
               >
                 <option value="">Brasil (Todos)</option>
                 {ufsDisponiveis.map(u => <option key={u} value={u}>{u}</option>)}
               </select>
               <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
            </div>

            <div className="relative">
               <select 
                 value={cidade} 
                 onChange={(e) => setCidade(e.target.value)}
                 disabled={!uf}
                 className="appearance-none bg-white border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-stone-700 outline-none focus:border-green-500 shadow-sm disabled:opacity-50"
               >
                 <option value="">Todas as Cidades</option>
                 {cidadesFiltradas.map(c => (
                   <option key={c} value={c}>
                     {c === 'ALTO_JACUI' ? 'Região Alto Jacuí' : c}
                   </option>
                 ))}               </select>
               <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
            </div>

            {/* Dica sobre a Região Alto Jacuí */}
            {cidade === 'ALTO_JACUI' && (
              <div className="group relative flex items-center">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 cursor-help transition-all hover:bg-amber-100">
                  <Lightbulb size={18} />
                </div>
                <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 invisible group-hover:visible animate-in fade-in zoom-in-95 duration-200">
                  <h4 className="text-xs font-bold text-stone-800 mb-2 uppercase tracking-wider">Cidades Abrangidas:</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Ibirubá, XV de Novembro, Selbach, Tapera, Espumoso, Alto Alegre, Campos Borges e Fortaleza dos Valos.
                  </p>
                  <div className="absolute -top-1 right-5 w-2 h-2 bg-white border-l border-t border-stone-100 rotate-45"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!hasData && !loading ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-20 text-center space-y-4">
          <div className="bg-stone-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
            <FlaskConical className="text-stone-300" size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800">Ainda não há dados suficientes</h2>
            <p className="text-stone-400 max-w-md mx-auto">
              O monitoramento regional utiliza amostras salvas para gerar as médias de RS e SC. 
              Realize alguns cálculos na calculadora para começar a ver os dados da sua região.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : data && (
        <>
          {/* Cards de Métricas Médias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              label="Média de pH Regional" 
              value={data.medias.ph} 
              sub="Acidez do Solo"
              icon={Activity}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <MetricCard 
              label="Dose Média de NC" 
              value={`${data.medias.nc} t/ha`} 
              sub="Necessidade de Calagem"
              icon={FlaskConical}
              color="text-green-600"
              bg="bg-green-50"
            />
            <MetricCard 
              label="Taxa de Aplicação" 
              value={`${data.medias.taxa_aplicacao}%`} 
              sub="Amostras com Calagem"
              icon={TrendingUp}
              color="text-purple-600"
              bg="bg-purple-50"
            />
            <MetricCard 
              label="Amostras na Região" 
              value={data.medias.total} 
              sub="Volume de Dados"
              icon={Map}
              color="text-amber-600"
              bg="bg-amber-50"
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sistemas de Manejo */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <h3 className="font-bold text-stone-800 mb-6">Adoção de Sistemas de Manejo</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sistemas}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.sistemas.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Problemas Relatados */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
              <h3 className="font-bold text-stone-800 mb-6 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                Desafios de Campo Relatados
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monitoramento} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="label" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} 
                      width={150}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="valor" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-stone-400 mt-4 text-center">
                * Baseado nos indicadores de monitoramento marcados pelos usuários durante o cálculo.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-stone-100 p-6 text-center border border-stone-200">
            <p className="text-sm text-stone-500 italic">
              "Os dados acima são agregados anonimamente para fornecer uma referência regional. Nenhuma informação individual ou de propriedade específica é exposta nesta ferramenta."
            </p>
          </div>
        </>
      )}

    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">{label}</p>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
          <p className="text-xs text-stone-400 mt-1">{sub}</p>
        </div>
        <div className={`p-3 rounded-2xl ${bg} ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
