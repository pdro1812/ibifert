import { Navigate, useParams } from 'react-router-dom';
import { CalculadoraCompletaPage } from './CalculadoraCompletaPage';

// /historico/editar/:tipo/:id — abre a análise salva na mesma calculadora,
// em modo de edição (os motores e o formulário são os mesmos).
export function EditarAnalisePage() {
  const { tipo, id } = useParams();
  const tipoAnalise = tipo === 'calagem' ? 'CALAGEM' : tipo === 'adubacao' ? 'ADUBACAO' : null;

  if (!tipoAnalise || !id) return <Navigate to="/historico" replace />;
  return <CalculadoraCompletaPage key={`${tipoAnalise}-${id}`} edicao={{ tipo: tipoAnalise, id }} />;
}
