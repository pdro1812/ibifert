import { Router } from 'express';
import { executarMotorCalagem } from '../services/motorCalagem';
import { validarEntrada } from '../services/calculadoraCalagem';
import { CalagemValidationError } from '../schemas/calagemSchema';
import { eq, count, sql, inArray } from 'drizzle-orm';
import { db } from '../database/db';
import { analises } from '../database/schema';
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

// GET /api/analises/regional-stats
analisesRoutes.get('/regional-stats', async (req: AuthRequest, res) => {
  try {
    const { uf, cidade } = req.query;

    const CIDADES_ALTO_JACUI = [
      'Ibiruba', 
      'XV de Novembro', 
      'Selbach', 
      'Tapera', 
      'Espumoso', 
      'Alto Alegre', 
      'Campos Borges', 
      'Fortaleza dos Valos'
    ];

    let whereClause = sql`1=1`;
    if (uf) whereClause = sql`${analises.uf} = ${uf}`;
    
    if (uf && cidade) {
      if (cidade === 'ALTO_JACUI') {
        whereClause = sql`${analises.uf} = ${uf} AND ${analises.cidade} IN (${sql.join(CIDADES_ALTO_JACUI.map(c => sql`${c}`), sql`, `)})`;
      } else {
        whereClause = sql`${analises.uf} = ${uf} AND ${analises.cidade} = ${cidade}`;
      }
    }

    // 1. Médias Gerais
    const [medias] = await db
      .select({
        ph_medio: sql`AVG(${analises.pH_agua})`,
        nc_medio: sql`AVG(${analises.NC_ajustada})`,
        total: count(analises.id),
        precisaram_calagem: sql`COUNT(CASE WHEN ${analises.aplicar_calcario} = true THEN 1 END)`,
      })
      .from(analises)
      .where(whereClause);

    // 2. Distribuição por Sistema de Manejo
    const sistemas = await db
      .select({
        name: analises.sistema_manejo,
        value: count(analises.id),
      })
      .from(analises)
      .where(whereClause)
      .groupBy(analises.sistema_manejo);

    // 3. Problemas de Monitoramento (Alertas de campo)
    const [monitoramento] = await db
      .select({
        compactacao: sql`COUNT(CASE WHEN ${analises.monitoramento_compactacao_restringindo} = true THEN 1 END)`,
        fosforo_baixo: sql`COUNT(CASE WHEN ${analises.monitoramento_disponibilidade_P_abaixo} = true THEN 1 END)`,
        produtividade_baixa: sql`COUNT(CASE WHEN ${analises.monitoramento_produtividade_abaixo_media} = true THEN 1 END)`,
      })
      .from(analises)
      .where(whereClause);

    // 4. Lista de Cidades Disponíveis (para o filtro)
    const cidadesRaw = await db
      .select({
        uf: analises.uf,
        cidade: analises.cidade,
      })
      .from(analises)
      .groupBy(analises.uf, analises.cidade)
      .orderBy(analises.uf, analises.cidade);

    // Injetar a região Alto Jacuí
    const cidades = [...cidadesRaw];
    if (uf === 'RS' || !uf) {
       cidades.push({ uf: 'RS', cidade: 'ALTO_JACUI' });
    }

    res.status(200).json({
      medias: {
        ph: Number(medias.ph_medio || 0).toFixed(1),
        nc: Number(medias.nc_medio || 0).toFixed(2),
        total: Number(medias.total || 0),
        taxa_aplicacao: medias.total ? (Number(medias.precisaram_calagem) / Number(medias.total) * 100).toFixed(0) : 0,
      },
      sistemas,
      monitoramento: [
        { label: 'Compactação de Solo', valor: Number(monitoramento.compactacao || 0) },
        { label: 'Fósforo Abaixo do Crítico', valor: Number(monitoramento.fosforo_baixo || 0) },
        { label: 'Baixa Produtividade', valor: Number(monitoramento.produtividade_baixa || 0) },
      ],
      filtros: cidades,
    });
  } catch (error: any) {
    console.error('[analises] Erro ao buscar stats regionais:', error);
    res.status(500).json({ erro: 'Erro ao processar dados regionais' });
  }
});

// GET /api/analises/historico
analisesRoutes.get('/historico', verificarToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';
    const registros = await listarAnalises(isAdmin ? undefined : req.userId);
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
