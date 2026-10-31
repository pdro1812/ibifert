import { Router } from 'express';
import { AdubacaoSchema, type EntradaAdubacao } from '../schemas/adubacaoSchema';
import { executarMotorAdubacao } from '../services/motorAdubacao';
import {
  criarAnaliseAdubacao,
  buscarAnaliseAdubacaoPorId,
  listarAnalisesAdubacaoPorUsuario,
  atualizarAnaliseAdubacao,
  excluirAnaliseAdubacao,
  arquivarAnaliseAdubacao,
} from '../database/adubacao';
import { verificarToken, AuthRequest } from '../middlewares/authMiddleware';
import { limitadorCalculoPublico } from '../middlewares/rateLimit';
import { LocalizacaoSchema } from '../schemas/localizacaoSchema';
import { ArquivarAnaliseSchema, DataAnaliseSchema } from '../schemas/gestaoAnaliseSchema';

export const adubacaoRoutes = Router();

// Entrada validada + localização + resultado do motor → colunas da tabela.
// Usado no salvar, no lote e na edição.
function colunasAdubacao(
  entrada: EntradaAdubacao,
  localizacao: { uf: string; cidade: string },
  resultado: unknown,
  data_analise: string | null
) {
  return {
    uf: localizacao.uf,
    cidade: localizacao.cidade,
    identificacao: entrada.identificacao || 'Análise Adubação',
    data_analise,

    argila: entrada.argila,
    MO: entrada.MO,
    CTC_pH7: entrada.CTC_pH7,
    P: entrada.P,
    metodo_P: entrada.metodo_P,
    K: entrada.K,
    metodo_K: entrada.metodo_K,
    Ca: entrada.Ca,
    Mg: entrada.Mg,
    S: entrada.S ?? null,
    Cu: entrada.Cu ?? null,
    Zn: entrada.Zn ?? null,
    B: entrada.B ?? null,
    Mn: entrada.Mn ?? null,
    pH_agua: entrada.pH_agua ?? null,

    cultura: entrada.cultura,
    num_cultivo: entrada.num_cultivo,
    rendimento_esperado: entrada.rendimento_esperado,
    cultura_antecedente: entrada.cultura_antecedente ?? null,
    sistema_cultivo: entrada.sistema_cultivo,
    tipo_correcao: entrada.tipo_correcao,
    densidade_plantas: entrada.densidade_plantas ?? null,
    finalidade_cevada: entrada.finalidade_cevada ?? null,

    recomendacao_json: resultado,
  };
}

function primeiraMensagemZod(error: any): string | null {
  return error?.name === 'ZodError' ? error.issues?.[0]?.message ?? 'Dados inválidos.' : null;
}

// Endpoint para calcular e salvar análise de adubação
adubacaoRoutes.post('/calcular', limitadorCalculoPublico, async (req: AuthRequest, res) => {
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

    // A localização vem do formulário (mesmo bloco da calagem); antes caía
    // silenciosamente em RS / "Não informada".
    const localizacao = LocalizacaoSchema.safeParse({ uf: dadosForm?.uf, cidade: dadosForm?.cidade });
    if (!localizacao.success) {
      return res.status(400).json({ error: localizacao.error.issues[0].message });
    }
    const entrada = AdubacaoSchema.parse(dadosForm);
    const data_analise = DataAnaliseSchema.parse(dadosForm?.data_analise);

    const analiseSalva = await criarAnaliseAdubacao({
      usuario_id: req.userId,
      talhao_id: dadosForm.talhao_id || undefined,
      ...colunasAdubacao(entrada, localizacao.data, resultado, data_analise),
    });

    res.status(201).json({
      message: 'Adubação salva com sucesso.',
      data: analiseSalva
    });
  } catch (error: any) {
    const erroValidacao = primeiraMensagemZod(error);
    if (erroValidacao) return res.status(400).json({ error: erroValidacao });
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
    const dataAnalise = DataAnaliseSchema.safeParse(req.body.data_analise);
    if (!dataAnalise.success) {
      return res.status(400).json({ error: dataAnalise.error.issues[0].message });
    }

    const resultadosProcessados = [];
    
    for (const amostra of amostras) {
      try {
        const dadosComTalhao = { ...amostra, talhao_id };
        const entradaValidada = AdubacaoSchema.parse(dadosComTalhao);
        const resultado = executarMotorAdubacao(entradaValidada);
        
        const analiseSalva = await criarAnaliseAdubacao({
          usuario_id,
          talhao_id,
          ...colunasAdubacao(
            entradaValidada,
            { uf: amostra.uf || 'RS', cidade: amostra.cidade || 'Não informada' },
            resultado,
            dataAnalise.data
          ),
        });
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
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const analises = await listarAnalisesAdubacaoPorUsuario(req.userId);
    res.json(analises);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar análise específica
adubacaoRoutes.get('/:id', verificarToken, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const analise = await buscarAnaliseAdubacaoPorId(req.params.id as string, req.userId);
    if (!analise) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    res.json(analise);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Gerenciamento (só o dono) ─────────────────────────────────────────────────

// PUT /api/adubacao/:id  →  corrige os dados e recalcula com o motor,
// atualizando o mesmo registro (sem criar outro).
adubacaoRoutes.put('/:id', verificarToken, async (req: AuthRequest, res) => {
  try {
    const { dadosForm } = req.body;
    const localizacao = LocalizacaoSchema.safeParse({ uf: dadosForm?.uf, cidade: dadosForm?.cidade });
    if (!localizacao.success) {
      return res.status(400).json({ error: localizacao.error.issues[0].message });
    }
    const entrada = AdubacaoSchema.parse(dadosForm);
    const data_analise = DataAnaliseSchema.parse(dadosForm?.data_analise);
    const resultado = executarMotorAdubacao(entrada);

    const analise = await atualizarAnaliseAdubacao(
      req.params.id as string,
      req.userId!,
      colunasAdubacao(entrada, localizacao.data, resultado, data_analise)
    );
    if (!analise) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json({ data: analise, resultado });
  } catch (error: any) {
    const erroValidacao = primeiraMensagemZod(error);
    if (erroValidacao) return res.status(400).json({ error: erroValidacao });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/adubacao/:id  →  exclusão definitiva
adubacaoRoutes.delete('/:id', verificarToken, async (req: AuthRequest, res) => {
  try {
    const analise = await excluirAnaliseAdubacao(req.params.id as string, req.userId!);
    if (!analise) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json(analise);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/adubacao/:id/arquivar  →  { arquivada: true } arquiva, false restaura
adubacaoRoutes.patch('/:id/arquivar', verificarToken, async (req: AuthRequest, res) => {
  try {
    const dados = ArquivarAnaliseSchema.safeParse(req.body);
    if (!dados.success) return res.status(400).json({ error: dados.error.issues[0].message });

    const analise = await arquivarAnaliseAdubacao(req.params.id as string, req.userId!, dados.data.arquivada);
    if (!analise) return res.status(404).json({ error: 'Análise não encontrada' });
    res.json(analise);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
