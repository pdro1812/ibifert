export interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

export interface Municipio {
  id: number;
  nome: string;
}

export const ibgeService = {
  getEstados: async (): Promise<Estado[]> => {
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
    const data = await response.json();
    return data.sort((a: Estado, b: Estado) => a.sigla.localeCompare(b.sigla));
  },

  getMunicipios: async (uf: string): Promise<Municipio[]> => {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    const data = await response.json();
    return data.sort((a: Municipio, b: Municipio) => a.nome.localeCompare(b.nome));
  }
};