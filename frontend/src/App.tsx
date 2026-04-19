import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sprout, AlertCircle, CheckCircle2, Leaf, FlaskConical, FileDown, Save, Check } from 'lucide-react';
import { CalagemSchema, type EntradaCalagem } from './schemas/calagemSchema';
import { api } from './services/api';
// Importamos a função que criamos no outro arquivo
import { gerarPDFRelatorio } from './services/pdfGenerator';

export default function App() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false); // Estado para controlar o feedback visual de salvar

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    getValues, // Precisamos do getValues para pegar os dados do form na hora de gerar o PDF
    formState: { errors }
  } = useForm<EntradaCalagem>({
    resolver: zodResolver(CalagemSchema) as any,
    defaultValues: {
      versao_regra: 'ibiferti-calagem-graos-v1.6',
      sistema_manejo: 'CONVENCIONAL',
      prnt_pct: 90,
      amostras: [{ 
        profundidade: '0-20', 
        ph_agua: 5.8, 
        indice_smp: 6.5,
        mo_pct: 2.0,
        al_cmolc_dm3: 1.2
      }]
    }
  });

  const { fields, replace } = useFieldArray({ 
    control, 
    name: 'amostras' 
  });

  const sistemaSelecionado = watch('sistema_manejo');

  const handleSistemaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoSistema = e.target.value as EntradaCalagem['sistema_manejo'];
    setValue('sistema_manejo', novoSistema);
    
    if (novoSistema !== 'PD_IMPLANTACAO') {
      setValue('modo_implantacao_pd', undefined);
    } else {
      setValue('modo_implantacao_pd', 'INCORPORADO'); 
    }

    if (novoSistema === 'PD_CONSOLIDADO') {
      replace([
        { profundidade: '0-10', ph_agua: 0, indice_smp: 0 },
        { profundidade: '10-20', ph_agua: 0, indice_smp: 0 }
      ]);
    } else {
      replace([{ 
        profundidade: '0-20', 
        ph_agua: 5.8, 
        indice_smp: 6.5,
        mo_pct: 2.0,
        al_cmolc_dm3: 1.2 
      }]);
    }
  };

  const onSubmit: SubmitHandler<EntradaCalagem> = async (data) => {
    setLoading(true);
    setResultado(null);
    setSalvo(false); // Reseta o botão de salvar caso calcule de novo
    try {
      const payloadLimpo = JSON.parse(JSON.stringify(data));
      const response = await api.post('/calcular', payloadLimpo);
      setResultado(response.data);
    } catch (error: any) {
      alert("Erro ao calcular: " + (error.response?.data?.mensagem || "Falha na API"));
      console.error(error.response?.data?.detalhes);
    } finally {
      setLoading(false);
    }
  };

  // Funções dos novos botões
  const handleGerarPDF = () => {
    const dadosFormulario = getValues();
    gerarPDFRelatorio(dadosFormulario, resultado);
  };

  const handleSalvar = () => {
    // Aqui no futuro você faz o POST pro backend pra salvar no banco (PostgreSQL)
    // api.post('/salvar-historico', { dados: getValues(), resultado });
    
    setSalvo(true);
    // Volta o botão ao normal depois de 3 segundos
    setTimeout(() => setSalvo(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F0] p-4 md:p-8 flex items-center justify-center font-sans text-stone-800">
      <div className="max-w-6xl w-full bg-white rounded-[2rem] shadow-2xl shadow-stone-200/50 overflow-hidden flex flex-col lg:flex-row border border-white/60">
        
        {/* Lado Esquerdo: Formulário (MANTIDO EXATAMENTE IGUAL) */}
        <div className="w-full lg:w-3/5 p-8 lg:p-12 bg-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
              <Leaf className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Ibiferti Calagem</h1>
              <p className="text-sm text-stone-500 font-medium">Motor de Recomendação Agronômica</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Sistema de Manejo</label>
                  <select 
                    {...register('sistema_manejo')} 
                    onChange={handleSistemaChange} 
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm"
                  >
                    <option value="CONVENCIONAL">Convencional</option>
                    <option value="PD_IMPLANTACAO">Plantio Direto - Implantação</option>
                    <option value="PD_CONSOLIDADO">Plantio Direto - Consolidado</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">PRNT do Calcário (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    {...register('prnt_pct')} 
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm" 
                  />
                </div>
              </div>

              {sistemaSelecionado === 'PD_IMPLANTACAO' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-semibold text-stone-700">Modo de Implantação</label>
                  <select 
                    {...register('modo_implantacao_pd')} 
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-sm"
                  >
                    <option value="INCORPORADO">Incorporado</option>
                    <option value="CAMPO_NATURAL_SUPERFICIAL">Campo Natural (Superficial)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical size={20} className="text-green-600" />
                <h3 className="text-lg font-bold text-stone-800">Amostras de Solo</h3>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="relative bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <span className="absolute -top-3 left-6 bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                      Camada {field.profundidade} cm
                    </span>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                      {[
                        { label: 'pH em Água', name: 'ph_agua' },
                        { label: 'Índice SMP', name: 'indice_smp' },
                        { label: 'Mat. Orgânica (%)', name: 'mo_pct' },
                        { label: 'V (%)', name: 'v_pct' },
                        { label: 'm (%)', name: 'm_pct' },
                        { label: 'Al (cmolc/dm³)', name: 'al_cmolc_dm3' }
                      ].map((item) => (
                        <div key={item.name} className="space-y-1">
                          <label className="text-xs font-medium text-stone-500">{item.label}</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            {...register(`amostras.${index}.${item.name}` as any)} 
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.amostras?.root?.message && (
                 <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                   <AlertCircle size={16} /> {errors.amostras.root.message}
                 </p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-semibold rounded-xl py-4 transition-all shadow-lg shadow-stone-900/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Processando Motor...' : 'Calcular Recomendação'}
            </button>
          </form>
        </div>

        {/* Lado Direito: Resultados (AGORA COM BOTÕES DE AÇÃO) */}
        <div className="w-full lg:w-2/5 p-8 lg:p-12 bg-gradient-to-br from-[#E8F3E8] to-[#F4F6F0] border-t lg:border-t-0 lg:border-l border-white/60 flex flex-col relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-stone-200/50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

          <div className="relative z-10 w-full h-full flex flex-col justify-center">
            {resultado ? (
              <div className="space-y-6 animate-fade-in flex-grow flex flex-col justify-center">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-green-500">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-800">Diagnóstico Concluído</h2>
                  <p className="text-stone-500">Análise baseada nos manuais oficiais</p>
                </div>
                
                <div className="bg-white rounded-[1.5rem] p-8 shadow-xl shadow-green-900/5 border border-white/80 text-center">
                  <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Dose Final Recomendada</p>
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400">
                      {resultado.dose_final_t_ha}
                    </span>
                    <span className="text-xl font-bold text-green-700">t/ha</span>
                  </div>
                  <div className="inline-block mt-2 bg-stone-100 text-stone-600 text-sm font-medium px-4 py-1.5 rounded-full">
                    Modo: {resultado.modo_aplicacao}
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 space-y-3 border border-white">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500">Base Matemática:</span> 
                    <span className="font-mono text-green-700 bg-green-100 px-2 py-0.5 rounded">{resultado.metodo_nc_utilizado}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500">Estado Motor:</span> 
                    <span className="font-mono text-stone-600 bg-stone-200 px-2 py-0.5 rounded">{resultado.estado_motor}</span>
                  </div>
                </div>

                {resultado.alertas?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 shadow-sm">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <p className="text-sm text-amber-800 font-medium leading-relaxed">{resultado.alertas[0].mensagem}</p>
                  </div>
                )}

                {/* --- NOVOS BOTÕES DE AÇÃO --- */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleGerarPDF}
                    className="flex items-center justify-center gap-2 bg-white border border-green-200 text-green-700 font-semibold rounded-xl py-3 hover:bg-green-50 hover:border-green-300 transition-all shadow-sm"
                  >
                    <FileDown size={18} />
                    Gerar PDF
                  </button>

                  <button 
                    onClick={handleSalvar}
                    disabled={salvo}
                    className={`flex items-center justify-center gap-2 font-semibold rounded-xl py-3 transition-all shadow-sm ${
                      salvo 
                      ? 'bg-green-500 text-white border border-green-500' 
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    {salvo ? (
                      <>
                        <Check size={18} />
                        Salvo!
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Salvar
                      </>
                    )}
                  </button>
                </div>

              </div>
            ) : (
               <div className="flex flex-col items-center justify-center text-center h-full space-y-4 opacity-60">
                 <div className="w-20 h-20 bg-stone-200/50 rounded-full flex items-center justify-center">
                   <Sprout size={32} className="text-stone-400" />
                 </div>
                 <h3 className="text-xl font-semibold text-stone-600">Aguardando Dados</h3>
                 <p className="text-stone-500 max-w-xs leading-relaxed">
                   Preencha os dados das amostras ao lado para acionar o motor de calagem agronômica.
                 </p>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}