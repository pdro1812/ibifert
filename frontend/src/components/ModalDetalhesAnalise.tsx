import { X, MapPin, FlaskConical, Beaker, ClipboardList, AlertTriangle } from 'lucide-react';

interface AnaliseDetalhes {
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
  usuario_nome?: string | null;
  usuario_email?: string | null;
}

interface ModalDetalhesAnaliseProps {
  analise: AnaliseDetalhes | null;
  onClose: () => void;
}

export function ModalDetalhesAnalise({ analise, onClose }: ModalDetalhesAnaliseProps) {
  if (!analise) return null;

  const dataFormatada = new Date(analise.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-xl text-green-600">
              <FlaskConical size={20} />
            </div>
            <div>
              <h2 className="font-bold text-stone-800">Detalhes da Amostra</h2>
              <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">{dataFormatada}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Sessão: Origem */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-stone-400">
              <MapPin size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Localização e Origem</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard label="Cidade / UF" value={`${analise.cidade} - ${analise.uf}`} />
              <InfoCard label="Identificação" value={analise.identificacao || 'Nenhuma'} />
              <div className="md:col-span-2">
                <InfoCard 
                  label="Proprietário" 
                  value={analise.usuario_nome ? `${analise.usuario_nome} (${analise.usuario_email})` : 'Modo Convidado'} 
                  highlight={!!analise.usuario_nome}
                />
              </div>
            </div>
          </section>

          {/* Sessão: Parâmetros Químicos */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-stone-400">
              <Beaker size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Análise de Solo (Química)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="pH em Água" value={analise.pH_agua?.toFixed(1)} />
              <MetricCard label="Índice SMP" value={analise.SMP?.toFixed(1)} />
              <MetricCard label="M.O. (%)" value={analise.MO?.toFixed(1)} />
              <MetricCard label="Al Trocável" value={analise.Al_trocavel?.toFixed(2)} />
              <MetricCard label="CTC pH 7.0" value={analise.CTC_pH7?.toFixed(2)} />
              <MetricCard label="V Atual (%)" value={analise.V_atual?.toFixed(1)} />
              <MetricCard label="Al Sat (%)" value={analise.Al_sat?.toFixed(1)} />
              <MetricCard label="PRNT (%)" value={analise.PRNT} />
            </div>
          </section>

          {/* Sessão: Resultado da Calagem */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-stone-400">
              <ClipboardList size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Resultado do Cálculo</h3>
            </div>
            <div className="rounded-2xl bg-green-50 border border-green-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-green-600 uppercase">Recomendação Final</span>
                <span className="px-2 py-1 bg-green-600 text-white text-[10px] font-black rounded-lg uppercase">
                  {analise.metodo_calc_roteado}
                </span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-green-700 leading-none">
                  {analise.NC_ajustada?.toFixed(2) || '0.00'}
                </span>
                <span className="text-lg font-bold text-green-500 mb-1">t/ha</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-green-600 font-bold uppercase">Sistema</p>
                  <p className="text-sm font-bold text-stone-700">{analise.sistema_manejo.replace('_', ' ')}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] text-green-600 font-bold uppercase">Aplicação</p>
                  <p className="text-sm font-bold text-stone-700">{analise.modo_aplicacao} ({analise.profundidade_cm}cm)</p>
                </div>
              </div>
            </div>
          </section>

          {/* Alertas */}
          {analise.alertas && analise.alertas.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle size={16} />
                <h3 className="text-xs font-bold uppercase tracking-widest">Alertas Agronômicos</h3>
              </div>
              <div className="space-y-2">
                {analise.alertas.map((alerta, i) => (
                  <div key={i} className="text-xs text-stone-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                    • {alerta}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 bg-stone-50 border border-stone-100 rounded-2xl">
      <p className="text-[9px] text-stone-400 font-bold uppercase mb-1">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-blue-600' : 'text-stone-700'}`}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="p-3 bg-white border border-stone-100 rounded-2xl text-center">
      <p className="text-[9px] text-stone-400 font-bold uppercase mb-1">{label}</p>
      <p className="text-sm font-black text-stone-800">{value ?? '--'}</p>
    </div>
  );
}
