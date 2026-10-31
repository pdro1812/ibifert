import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import {
  organizarRecomendacaoAdubacao,
  type LinhaNutriente,
  type ResultadoAdubacao,
} from '../services/organizarRecomendacaoAdubacao';

// Seções de resultado na ordem pedida pela coordenação: recomendações de
// nutrientes, observações técnicas e, por último, alertas e avisos.

function TituloSecao({ children }: { children: string }) {
  return <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{children}</p>;
}

export function SecaoObservacoes({ mensagens }: { mensagens: string[] }) {
  if (mensagens.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="secao-observacoes">
      <TituloSecao>Observações técnicas</TituloSecao>
      {mensagens.map((mensagem, i) => (
        <div key={`${mensagem}-${i}`} className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">{mensagem}</span>
        </div>
      ))}
    </div>
  );
}

export function SecaoAlertas({ mensagens }: { mensagens: string[] }) {
  if (mensagens.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="secao-alertas">
      <TituloSecao>Alertas e avisos</TituloSecao>
      {mensagens.map((mensagem, i) => (
        <div key={`${mensagem}-${i}`} className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">{mensagem}</span>
        </div>
      ))}
    </div>
  );
}

function CartaoDoseGrande({ nutriente, dose, detalhe, children }: {
  nutriente: string;
  dose: number;
  detalhe: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 text-center shadow-xl">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-400">{nutriente}</p>
      <div className="mb-1 flex items-baseline justify-center gap-2">
        <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-3xl font-extrabold text-transparent">
          {dose}
        </span>
        <span className="text-sm font-bold text-emerald-700">kg/ha</span>
      </div>
      <p className="text-[11px] font-semibold text-stone-400">{detalhe}</p>
      {children}
    </div>
  );
}

function CartaoNutrienteComplementar({ linha }: { linha: LinhaNutriente }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{linha.nutriente}</p>
        {linha.dose !== '—' ? <p className="text-right text-sm font-bold text-emerald-700">{linha.dose}</p> : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">{linha.orientacao}</p>
    </div>
  );
}

export function RecomendacaoAdubacao({ resultado }: { resultado: ResultadoAdubacao }) {
  const { k2o, n, p2o5 } = resultado.recomendacao;
  const organizada = organizarRecomendacaoAdubacao(resultado);
  // N, P₂O₅ e K₂O ficam nos cartões grandes; o que vier além deles (S) entra
  // como cartão complementar dentro de Macronutrientes.
  const macrosComplementares = organizada.macronutrientes.slice(3);

  return (
    <div className="space-y-5">
      <div className="space-y-3" data-testid="secao-macronutrientes">
        <TituloSecao>Macronutrientes</TituloSecao>
        <CartaoDoseGrande nutriente="Nitrogênio (N)" dose={n.dose_total_kg_ha} detalhe={n.tipo} />
        <CartaoDoseGrande nutriente="Fósforo (P₂O₅)" dose={p2o5.dose_total_kg_ha} detalhe={p2o5.tipo_adubacao} />
        <CartaoDoseGrande nutriente="Potássio (K₂O)" dose={k2o.dose_total_kg_ha} detalhe={k2o.tipo_adubacao}>
          <div className="mt-2 flex justify-center gap-4 border-t border-stone-100 pt-2">
            <span className="text-[10px] font-bold uppercase text-stone-500">
              Linha: <strong className="text-emerald-700">{k2o.k2o_semeadura_kg_ha}</strong> kg/ha
            </span>
            <span className="text-[10px] font-bold uppercase text-stone-500">
              Lanço: <strong className="text-emerald-700">{k2o.k2o_complementar_kg_ha}</strong> kg/ha
            </span>
          </div>
        </CartaoDoseGrande>
        {macrosComplementares.map((linha) => <CartaoNutrienteComplementar key={linha.nutriente} linha={linha} />)}
      </div>

      <div className="space-y-3" data-testid="secao-micronutrientes">
        <TituloSecao>Micronutrientes</TituloSecao>
        {organizada.micronutrientes.length > 0 ? (
          organizada.micronutrientes.map((linha) => <CartaoNutrienteComplementar key={linha.nutriente} linha={linha} />)
        ) : (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-white/60 p-3 text-xs text-stone-500">
            Nenhuma recomendação de micronutriente para esta análise.
          </p>
        )}
      </div>

      <SecaoObservacoes mensagens={organizada.observacoes.map((a) => a.mensagem)} />
      <SecaoAlertas mensagens={organizada.alertas.map((a) => a.mensagem)} />
    </div>
  );
}
