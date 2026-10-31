// Datas da análise: data_analise vem como 'AAAA-MM-DD' (dia informado pelo
// usuário, sem fuso); criado_em é o timestamp de inserção no sistema.

export function hojeLocalISO(): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatarDataAnalise(dataISO: string | null | undefined): string | null {
  if (!dataISO) return null;
  const [ano, mes, dia] = dataISO.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : null;
}

export function formatarDataInsercao(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
