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

    // Se o usuário não estiver logado, não tem problema no MVP se a rota não usar verificarToken obrigatório
    // Porém, vamos tentar ler o header se houver
    let usuario_id = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // Usar a mesma lógica do analisesRoutes
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_dev');
        usuario_id = (decoded as any).userId;
      } catch (e) {
        // ignora se token invalido na rota pública
      }
    }

    // 3. Persistir
    const payloadBanco = {
      usuario_id: usuario_id || undefined,
      talhao_id: dadosForm.talhao_id || undefined,
      uf: dadosForm.uf || 'RS',
      cidade: dadosForm.cidade || 'Não informada',
      identificacao: dadosForm.identificacao || 'Análise Adubação',
      
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

    res.status(201).json({
      message: 'Adubação processada e salva com sucesso.',
      data: analiseSalva,
      resultado: resultado
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Erro de validação', details: error.errors });
    } else {
      res.status(500).json({ error: error.message });
    }
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
