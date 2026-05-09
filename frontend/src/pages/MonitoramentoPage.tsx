import { Map, Construction } from 'lucide-react';

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MonitoramentoPage() {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-8 py-16">
      {/* Icon badge */}
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-stone-100 to-stone-200 shadow-inner">
        <Map size={44} className="text-stone-400" />
      </div>

      {/* Text */}
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Construction size={16} className="text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
            Em desenvolvimento
          </span>
        </div>
        <h1 className="text-4xl font-bold text-stone-800">Monitoramento Regional</h1>
        <p className="max-w-md text-base text-stone-500">
          Visualize dados agregados de correção de solo por município e acompanhe
          tendências regionais de acidez. Este módulo estará disponível em breve.
        </p>
      </div>

      {/* Feature cards — preview do que virá */}
      <div className="mt-4 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            titulo: 'Mapa de pH',
            descricao: 'Distribuição geográfica do pH médio por município do RS.',
            cor: 'bg-green-50 border-green-200',
            texto: 'text-green-700',
          },
          {
            titulo: 'Índice SMP Regional',
            descricao: 'Comparativo do índice SMP entre regiões produtoras.',
            cor: 'bg-blue-50 border-blue-200',
            texto: 'text-blue-700',
          },
          {
            titulo: 'Histórico de Calagem',
            descricao: 'Evolução da necessidade de calagem nos últimos 5 anos.',
            cor: 'bg-amber-50 border-amber-200',
            texto: 'text-amber-700',
          },
        ].map((card) => (
          <div
            key={card.titulo}
            className={`rounded-2xl border ${card.cor} p-6 opacity-60`}
          >
            <h3 className={`font-bold ${card.texto}`}>{card.titulo}</h3>
            <p className="mt-2 text-sm text-stone-500">{card.descricao}</p>
            <div className="mt-4 h-2 w-full rounded-full bg-stone-200">
              <div className="h-2 w-1/3 rounded-full bg-stone-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}