import { Router } from 'express';
import { AdubacaoSchema } from '../schemas/adubacaoSchema';
import { executarMotorAdubacao } from '../services/motorAdubacao';
import {
  criarAnaliseAdubacao,
  buscarAnaliseAdubacaoPorId,
  listarAnalisesAdubacaoPorUsuario
} from '../database/adubacao';
import { verificarToken, AuthRequest } from '../middlewares/authMiddleware';

export const adubacaoRoutes = Router();

// Endpoint para calcular e salvar análise de adubação
adubacaoRoutes.post('/calcular', async (req: AuthRequest, res) => {
  try {
    const dadosForm = req.body;
    
    // 1. Validar
    const entradaValidada = AdubacaoSchema.parse(dadosForm);

    // 2. Calcular
    const resultado = executarMotorAdubacao(entradaValidada);

    // 3. Retornar apenas o resultado do cálculo
    res.status(200).json({
      message: 'Adubação calculada com sucesso.',
      resultado: resultado,
      dadosEntrada: entradaValidada // útil para o frontend mandar pro salvar
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Erro de validação', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Endpoint exclusivo para salvar o resultado da adubação no banco
adubacaoRoutes.post('/salvar', verificarToken, async (req: AuthRequest, res) => {
  try {
    const { dadosForm, resultado } = req.body;
    
    // Como verificarToken está ativo, garantimos req.userId
    const usuario_id = req.userId;

    const payloadBanco = {
      usuario_id: usuario_id,
      talhao_id: dadosForm.talhao_id || undefined,
      uf: dadosForm.uf || 'RS',
      cidade: dadosForm.cidade || 'Não informada',
      identificacao: dadosForm.identificacao || 'Análise Adubação',
      
      argila: dadosForm.argila,
      MO: dadosForm.MO,
      CTC_pH7: dadosForm.CTC_pH7,
      P: dadosForm.P,
      metodo_P: dadosForm.metodo_P,
      K: dadosForm.K,
      metodo_K: dadosForm.metodo_K,
      Ca: dadosForm.Ca,
      Mg: dadosForm.Mg,
      S: dadosForm.S ?? undefined,
      Cu: dadosForm.Cu ?? undefined,
      Zn: dadosForm.Zn ?? undefined,
      B: dadosForm.B ?? undefined,
      Mn: dadosForm.Mn ?? undefined,
      pH_agua: dadosForm.pH_agua ?? undefined,

      cultura: dadosForm.cultura,
      num_cultivo: dadosForm.num_cultivo,
      rendimento_esperado: dadosForm.rendimento_esperado,
      cultura_antecedente: dadosForm.cultura_antecedente ?? undefined,
      sistema_cultivo: dadosForm.sistema_cultivo,
      tipo_correcao: dadosForm.tipo_correcao,
      densidade_plantas: dadosForm.densidade_plantas ?? undefined,
      finalidade_cevada: dadosForm.finalidade_cevada ?? undefined,

      recomendacao_json: resultado,
    };

    const analiseSalva = await criarAnaliseAdubacao(payloadBanco as any);

    res.status(201).json({
      message: 'Adubação salva com sucesso.',
      data: analiseSalva
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para processar lote (bulk) de adubações
adubacaoRoutes.post('/bulk', verificarToken, async (req: AuthRequest, res) => {
  try {
    const { talhao_id, amostras } = req.body;
    const usuario_id = req.userId;

    if (!Array.isArray(amostras)) {
      return res.status(400).json({ error: 'Amostras devem ser um array' });
    }

    const resultadosProcessados = [];
    
    for (const amostra of amostras) {
      try {
        const dadosComTalhao = { ...amostra, talhao_id };
        const entradaValidada = AdubacaoSchema.parse(dadosComTalhao);
        const resultado = executarMotorAdubacao(entradaValidada);
        
        const payloadBanco = {
          usuario_id: usuario_id,
          talhao_id: talhao_id,
          uf: entradaValidada.uf || 'RS',
          cidade: entradaValidada.cidade || 'Não informada',
          identificacao: entradaValidada.identificacao || 'Análise Adubação',
          
          argila: entradaValidada.argila,
          MO: entradaValidada.MO,
          CTC_pH7: entradaValidada.CTC_pH7,
          P: entradaValidada.P,
          metodo_P: entradaValidada.metodo_P,
          K: entradaValidada.K,
          metodo_K: entradaValidada.metodo_K,
          Ca: entradaValidada.Ca,
          Mg: entradaValidada.Mg,
          S: entradaValidada.S ?? undefined,
          Cu: entradaValidada.Cu ?? undefined,
          Zn: entradaValidada.Zn ?? undefined,
          B: entradaValidada.B ?? undefined,
          Mn: entradaValidada.Mn ?? undefined,
          pH_agua: entradaValidada.pH_agua ?? undefined,

          cultura: entradaValidada.cultura,
          num_cultivo: entradaValidada.num_cultivo,
          rendimento_esperado: entradaValidada.rendimento_esperado,
          cultura_antecedente: entradaValidada.cultura_antecedente ?? undefined,
          sistema_cultivo: entradaValidada.sistema_cultivo,
          tipo_correcao: entradaValidada.tipo_correcao,
          densidade_plantas: entradaValidada.densidade_plantas ?? undefined,
          finalidade_cevada: entradaValidada.finalidade_cevada ?? undefined,

          recomendacao_json: resultado,
        };

        const analiseSalva = await criarAnaliseAdubacao(payloadBanco as any);
        resultadosProcessados.push({ sucesso: true, id: analiseSalva.id, identificacao: amostra.identificacao });
      } catch (err: any) {
        console.error(`Erro ao processar amostra ${amostra.identificacao}:`, err);
        resultadosProcessados.push({ sucesso: false, identificacao: amostra.identificacao, erro: err.message });
      }
    }

    res.status(200).json({
      message: 'Processamento em lote concluído',
      total: amostras.length,
      resultados: resultadosProcessados
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para listar as análises do usuário logado
adubacaoRoutes.get('/', verificarToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const analises = await listarAnalisesAdubacaoPorUsuario(req.user.id);
    res.json(analises);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar análise específica
adubacaoRoutes.get('/:id', verificarToken, async (req: AuthRequest, res) => {
  try {
    const analise = await buscarAnaliseAdubacaoPorId(req.params.id);
    if (!analise) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    res.json(analise);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
