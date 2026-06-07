import { Router } from 'express';
import { 
  obtemDoseConvencional, 
  obtemDoseDiretoImplantacao, 
  obtemDoseDiretoConsolidadoSemRestricao, 
  obtemDoseDiretoConsolidadoComRestricao 
} from '../services/motorStandalone';

const router = Router();

router.post('/calcular', (req, res) => {
  const { 
    tipo_sistema, 
    ph_0_20, 
    smp_0_20, 
    ph_0_10, 
    smp_0_10, 
    ph_10_20, 
    smp_10_20,
    saturacao_base_0_10, 
    saturacao_aluminio_0_10,
    saturacao_aluminio_10_20,
    ph_referencia = 6, 
    prnt = 100 
  } = req.body;

  let result;

  try {
    switch (tipo_sistema) {
      case 'CONVENCIONAL':
        result = obtemDoseConvencional(ph_0_20, smp_0_20, ph_referencia, prnt);
        break;
      case 'DIRETO_IMPLANTACAO':
        result = obtemDoseDiretoImplantacao(ph_0_20, smp_0_20, ph_referencia, prnt);
        break;
      case 'DIRETO_CONSOLIDADO_SEM_RESTRICAO':
        result = obtemDoseDiretoConsolidadoSemRestricao(
          ph_0_10, 
          saturacao_base_0_10, 
          saturacao_aluminio_0_10, 
          smp_0_10, 
          ph_referencia, 
          prnt
        );
        break;
      case 'DIRETO_CONSOLIDADO_COM_RESTRICAO':
        result = obtemDoseDiretoConsolidadoComRestricao(
          ph_10_20, 
          saturacao_aluminio_10_20, 
          smp_10_20, 
          ph_referencia, 
          prnt
        );
        break;
      default:
        return res.status(400).json({ error: 'Tipo de sistema inválido' });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export { router as standaloneRoutes };
