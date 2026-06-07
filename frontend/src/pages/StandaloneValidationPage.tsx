import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  FlaskConical, 
  Info, 
  Play, 
  Settings2, 
  Database,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export function StandaloneValidationPage() {
  const [tipo_sistema, setTipoSistema] = useState('CONVENCIONAL');
  const [params, setParams] = useState<any>({
    ph_0_20: 5.0,
    smp_0_20: 5.5,
    ph_0_10: 5.0,
    smp_0_10: 5.5,
    ph_10_20: 5.0,
    smp_10_20: 5.5,
    saturacao_base_0_10: 50,
    saturacao_aluminio_0_10: 20,
    saturacao_aluminio_10_20: 35,
    ph_referencia: 6,
    prnt: 100,
  });

  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams((prev: any) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const calcular = async () => {
    setLoading(true);
    setErro(null);
    try {
      const payload = { tipo_sistema, ...params };
      const res = await api.post('/standalone/calcular', payload);
      setResultado(res.data);
    } catch (error: any) {
      setErro(error.response?.data?.error || 'Erro ao calcular');
    } finally {
      setLoading(false);
    }
  };

  const renderCampo = (label: string, name: string, value: number, step: string = "0.1") => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        step={step}
        name={name}
        value={value}
        onChange={handleInputChange}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white"
      />
    </div>
  );

  return (
    <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl lg:flex-row">
      
      {/* ── Esquerda: Formulário de Entrada ── */}
      <div className="w-full bg-white p-8 lg:w-3/5 lg:p-12">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
            <FlaskConical className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Validação Motor SQL</h1>
            <p className="text-sm font-medium text-stone-500">Lógica extraída do PDF "Funções.pdf"</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Configuração do Sistema */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 size={18} className="text-stone-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Configuração</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Sistema de Plantio</label>
                <select 
                  value={tipo_sistema}
                  onChange={(e) => setTipoSistema(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white"
                >
                  <option value="CONVENCIONAL">Convencional</option>
                  <option value="DIRETO_IMPLANTACAO">PD Implantação</option>
                  <option value="DIRETO_CONSOLIDADO_SEM_RESTRICAO">PD Consolidado (0-10cm)</option>
                  <option value="DIRETO_CONSOLIDADO_COM_RESTRICAO">PD Consolidado (10-20cm)</option>
                </select>
              </div>
              {renderCampo("PRNT (%)", "prnt", params.prnt, "1")}
            </div>
          </div>

          {/* Dados de Solo Dinâmicos */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Database size={18} className="text-stone-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Dados de Solo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(tipo_sistema === 'CONVENCIONAL' || tipo_sistema === 'DIRETO_IMPLANTACAO') && (
                <>
                  {renderCampo("pH (0-20cm)", "ph_0_20", params.ph_0_20)}
                  {renderCampo("SMP (0-20cm)", "smp_0_20", params.smp_0_20)}
                </>
              )}

              {tipo_sistema === 'DIRETO_CONSOLIDADO_SEM_RESTRICAO' && (
                <>
                  {renderCampo("pH (0-10cm)", "ph_0_10", params.ph_0_10)}
                  {renderCampo("SMP (0-10cm)", "smp_0_10", params.smp_0_10)}
                  {renderCampo("Sat. Bases (%)", "saturacao_base_0_10", params.saturacao_base_0_10, "1")}
                  {renderCampo("Sat. Alumínio (%)", "saturacao_aluminio_0_10", params.saturacao_aluminio_0_10, "1")}
                </>
              )}

              {tipo_sistema === 'DIRETO_CONSOLIDADO_COM_RESTRICAO' && (
                <>
                  {renderCampo("pH (10-20cm)", "ph_10_20", params.ph_10_20)}
                  {renderCampo("SMP (10-20cm)", "smp_10_20", params.smp_10_20)}
                  {renderCampo("Sat. Alumínio 10-20cm (%)", "saturacao_aluminio_10_20", params.saturacao_aluminio_10_20, "1")}
                </>
              )}
            </div>
          </div>

          <button 
            onClick={calcular}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 font-semibold text-white shadow-lg transition-all hover:bg-stone-800 disabled:bg-stone-300"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>Executar Cálculo SQL <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>

      {/* ── Direita: Resultado ── */}
      <div className="flex w-full flex-col border-t border-white/60 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 lg:w-2/5 lg:border-l lg:border-t-0 lg:p-12">
        <div className="relative z-10 flex h-full w-full flex-col justify-center">
          
          {erro ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Erro no Processamento</h2>
              </div>
              <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
                <p className="text-sm font-bold uppercase tracking-wider text-red-600">Mensagem</p>
                <p className="mt-2 text-stone-700">{erro}</p>
              </div>
            </div>
          ) : resultado ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-500 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Resultado SQL</h2>
              </div>

              <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl">
                <p className="mb-1 text-sm font-bold uppercase tracking-wider text-stone-400">Dose Recomendada</p>
                <div className="mb-1 flex items-baseline justify-center gap-2">
                  <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-6xl font-extrabold text-transparent">
                    {resultado.dose_recomendada.toFixed(3)}
                  </span>
                  <span className="text-xl font-bold text-indigo-700">t/ha</span>
                </div>
                <p className="text-xs text-stone-400">Motor Standalone v1.0</p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-white/80 p-5 shadow-sm">
                  <p className="text-sm font-bold text-stone-800 mb-1">Parecer Agronômico</p>
                  <p className="text-sm text-stone-600 leading-relaxed">{resultado.msg}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
                    <p className="mb-1 text-xs text-stone-400 uppercase tracking-wider">Modo</p>
                    <p className="text-sm font-bold text-stone-700">
                      {resultado.modo_aplicacao === 0 ? 'Superficial' : resultado.modo_aplicacao === 1 ? 'Incorporado' : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
                    <p className="mb-1 text-xs text-stone-400 uppercase tracking-wider">Status</p>
                    <p className="text-sm font-bold text-stone-700">
                      {resultado.erro ? 'Com Alerta' : 'Sucesso'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Este cálculo foi realizado utilizando exclusivamente as fórmulas extraídas do documento de referência técnica.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-60">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-200/50">
                <FlaskConical size={32} className="text-stone-400" />
              </div>
              <h3 className="text-xl font-semibold">Pronto para Teste</h3>
              <p className="max-w-xs text-sm text-stone-400">
                Ajuste os parâmetros ao lado e execute o motor para validar a lógica SQL.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
