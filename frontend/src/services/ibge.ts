export interface Municipio {
  id: number;
  nome: string;
}

export const ibgeService = {
  getMunicipios: async (uf: string): Promise<Municipio[]> => {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    const data = await response.json();
    return data.sort((a: Municipio, b: Municipio) => a.nome.localeCompare(b.nome));
  }
};