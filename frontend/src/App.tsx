import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sprout, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CalagemSchema, type EntradaCalagem } from './schemas/calagemSchema';
import { api } from './services/api';

// IMPORTAÇÃO DO CSS PURO
import './App.css';

export default function App() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
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

  return (
    <div className="app-container">
      <div className="card-container">
        
        {/* Lado Esquerdo: Formulário */}
        <div className="left-panel">
          <div className="header-container">
            <div className="icon-wrapper"><Sprout size={24} /></div>
            <h1 className="main-title">Ibiferti Calagem</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Sistema de Manejo</label>
                <select {...register('sistema_manejo')} onChange={handleSistemaChange} className="form-input">
                  <option value="CONVENCIONAL">Convencional</option>
                  <option value="PD_IMPLANTACAO">PD - Implantação</option>
                  <option value="PD_CONSOLIDADO">PD - Consolidado</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">PRNT do Calcário (%)</label>
                <input type="number" step="0.1" {...register('prnt_pct')} className="form-input" />
              </div>
            </div>

            {sistemaSelecionado === 'PD_IMPLANTACAO' && (
              <div className="form-group">
                <label className="form-label">Modo de Implantação</label>
                <select {...register('modo_implantacao_pd')} className="form-input">
                  <option value="INCORPORADO">Incorporado</option>
                  <option value="CAMPO_NATURAL_SUPERFICIAL">Campo Natural (Superficial)</option>
                </select>
              </div>
            )}

            <div>
              <h3 className="section-title">Amostras de Solo</h3>
              {fields.map((field, index) => (
                <div key={field.id} className="amostra-card">
                  <span className="amostra-header">Camada {field.profundidade} cm</span>
                  
                  <div className="amostra-grid">
                    <div>
                      <label className="mini-label">pH em Água</label>
                      <input type="number" step="0.1" {...register(`amostras.${index}.ph_agua` as const)} className="form-input" />
                    </div>
                    <div>
                      <label className="mini-label">Índice SMP</label>
                      <input type="number" step="0.1" {...register(`amostras.${index}.indice_smp` as const)} className="form-input" />
                    </div>
                    <div>
                      <label className="mini-label">Mat. Orgânica (%)</label>
                      <input type="number" step="0.1" {...register(`amostras.${index}.mo_pct` as const)} className="form-input" />
                    </div>
                    <div>
                      <label className="mini-label">V (%)</label>
                      <input type="number" step="0.1" {...register(`amostras.${index}.v_pct` as const)} className="form-input" />
                    </div>
                    <div>
                      <label className="mini-label">m (%)</label>
                      <input type="number" step="0.1" {...register(`amostras.${index}.m_pct` as const)} className="form-input" />
                    </div>
                    <div>
                      <label className="mini-label">Al (cmolc/dm3)</label>
                      <input type="number" step="0.1" {...register(`amostras.${index}.al_cmolc_dm3` as const)} className="form-input" />
                    </div>
                  </div>
                </div>
              ))}
              
              {errors.amostras?.root?.message && (
                 <p className="error-text">{errors.amostras.root.message}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Calculando no Motor...' : 'Calcular Recomendação'}
            </button>
          </form>
        </div>

        {/* Lado Direito: Resultados */}
        <div className="right-panel">
          {resultado ? (
            <div>
              <div className="result-center">
                <CheckCircle2 className="icon-large icon-green" />
                <h2 className="result-title">Diagnóstico Concluído</h2>
              </div>
              
              <div className="dose-box">
                <p className="dose-label">Dose Final Recomendada</p>
                <p className="dose-value">{resultado.dose_final_t_ha} <span className="dose-unit">t/ha</span></p>
                <p className="dose-mode">Modo: {resultado.modo_aplicacao}</p>
              </div>

              <div className="result-details">
                <div className="detail-row">
                  <span>Base Matemática:</span> <span className="text-mono-green">{resultado.metodo_nc_utilizado}</span>
                </div>
                <div className="detail-row">
                  <span>Estado Motor:</span> <span className="text-mono-stone">{resultado.estado_motor}</span>
                </div>
                <div className="detail-row">
                  <span>PRNT Aplicado:</span> <span className="text-mono-stone">{resultado.prnt_utilizado_pct}%</span>
                </div>
              </div>

              {resultado.alertas?.length > 0 && (
                <div className="alert-box">
                  <AlertCircle className="alert-icon" />
                  <p style={{ margin: 0 }}>{resultado.alertas[0].mensagem}</p>
                </div>
              )}
            </div>
          ) : (
             <div className="result-center">
               <Sprout className="icon-large icon-stone" />
               <p style={{ color: '#a8a29e' }}>Preencha os dados ao lado para acionar o motor de calagem agronômica.</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}