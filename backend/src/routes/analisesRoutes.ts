import { Router } from 'express';
import { executarMotorCalagem } from '../services/motorCalagem';
import { validarEntrada } from '../services/calculadoraCalagem';
import { CalagemValidationError } from '../schemas/calagemSchema';
import { salvarAnalise, listarAnalises } from '../database/analises';

export const analisesRoutes = Router();

analisesRoutes.post('/calcular', async (req, res) => {
  try {
    const entrada = validarEntrada(req.body);
    const resultado = executarMotorCalagem(entrada);

    salvarAnalise({
      entrada,
      resultado,
      uf:                  req.body.uf,
      cidade:              req.body.cidade,
      modo_al_sat:         req.body.modo_al_sat,
      monitoramento_ativo: req.body.monitoramento_ativo,
      usuario_id:          null,
    }).catch((err) => {
      console.error('[analises] Falha ao salvar no banco:', err);
    });

    res.status(200).json({ sucesso: true, resultado });

  } catch (error: any) {
    if (error instanceof CalagemValidationError) {
      return res.status(400).json({
        sucesso: false,
        codigo_erro: 'E001_FALHA_VALIDACAO_ENTRADA',
        mensagem: error.message,
      });
    }
    res.status(500).json({
      sucesso: false,
      codigo_erro: 'E002_ERRO_INTERNO',
      mensagem: 'Erro inesperado no motor de cálculo.',
      detalhes: error?.message,
    });
  }
});

// GET /api/analises/historico
analisesRoutes.get('/historico', async (_req, res) => {
  try {
    const registros = await listarAnalises();
    res.status(200).json({ sucesso: true, dados: registros });
  } catch (error: any) {
    res.status(500).json({
      sucesso: false,
      codigo_erro: 'E003_ERRO_LISTAGEM',
      mensagem: 'Erro ao buscar histórico de análises.',
      detalhes: error?.message,
    });
  }
});