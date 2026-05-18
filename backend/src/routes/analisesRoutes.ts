import { Router } from 'express';
import { executarMotorCalagem } from '../services/motorCalagem';
import { validarEntrada } from '../services/calculadoraCalagem';
import { CalagemValidationError } from '../schemas/calagemSchema';
import { salvarAnalise, listarAnalises, salvarLoteAnalises } from '../database/analises';
import { verificarToken, AuthRequest } from '../middlewares/authMiddleware';

export const analisesRoutes = Router();

analisesRoutes.post('/calcular', async (req: AuthRequest, res) => {
  try {
    const entrada = validarEntrada(req.body);
    const resultado = executarMotorCalagem(entrada);

    // Se o usuário estiver logado, o token será validado (opcionalmente)
    // Para simplificar, vamos tentar extrair o userId se houver token
    // Se quiser tornar OBRIGATÓRIO, use o middleware 'verificarToken' antes da rota.
    // Como o motor também é público, vamos tentar ler o header manualmente ou permitir opcional.
    
    let usuario_id = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const [, token] = authHeader.split(' ');
        const decoded = (require('jsonwebtoken')).verify(token, process.env.JWT_SECRET || 'super-secret-key') as { id: string };
        usuario_id = decoded.id;
      } catch (e) { /* ignore */ }
    }

    salvarAnalise({
      entrada,
      resultado,
      uf:                  req.body.uf,
      cidade:              req.body.cidade,
      talhao_id:           req.body.talhao_id,
      modo_al_sat:         req.body.modo_al_sat,
      monitoramento_ativo: req.body.monitoramento_ativo,
      usuario_id,
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

analisesRoutes.post('/bulk', verificarToken, async (req: AuthRequest, res) => {
  try {
    const { 
      talhao_id, 
      uf, 
      cidade, 
      amostras 
    } = req.body;

    const usuario_id = req.userId;

    if (!Array.isArray(amostras) || amostras.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhuma amostra enviada.' });
    }

    const registrosParaSalvar = amostras.map((amostra: any) => {
      const entrada = validarEntrada(amostra);
      const resultado = executarMotorCalagem(entrada);

      return {
        entrada,
        resultado,
        uf,
        cidade,
        talhao_id,
        modo_al_sat: amostra.modo_al_sat ?? 'direto',
        monitoramento_ativo: !!amostra.monitoramento,
        usuario_id, 
      };
    });

    const resultados = await salvarLoteAnalises(registrosParaSalvar);

    res.status(200).json({ 
      sucesso: true, 
      quantidade: resultados.length,
      mensagem: `${resultados.length} amostras processadas e salvas com sucesso.` 
    });

  } catch (error: any) {
    console.error('[analises] Erro no processamento bulk:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao processar lote de análises.',
      detalhes: error?.message,
    });
  }
});

// GET /api/analises/historico
analisesRoutes.get('/historico', verificarToken, async (req: AuthRequest, res) => {
  try {
    const registros = await listarAnalises(req.userId);
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
