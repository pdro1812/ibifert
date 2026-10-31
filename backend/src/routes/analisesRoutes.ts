import { Router } from 'express';
import { executarMotorCalagem } from '../services/motorCalagem';
import { validarEntrada } from '../services/calculadoraCalagem';
import { CalagemValidationError } from '../schemas/calagemSchema';
import { LocalizacaoSchema } from '../schemas/localizacaoSchema';
import { count, sql, inArray } from 'drizzle-orm';
import { db } from '../database/db';
import { analises, talhoes } from '../database/schema';
import {
  salvarAnalise,
  listarAnalises,
  salvarLoteAnalises,
  buscarAnalisePorId,
  atualizarAnalise,
  excluirAnalise,
  arquivarAnalise,
  vincularAnaliseAoUsuario,
} from '../database/analises';
import { getTalhaoById } from '../database/fazendas';
import { listarAnalisesAdubacaoHistorico } from '../database/adubacao';
import { ArquivarAnaliseSchema, DataAnaliseSchema, filtroArquivadas } from '../schemas/gestaoAnaliseSchema';
import { verificarToken, AuthRequest } from '../middlewares/authMiddleware';
import { limitadorCalculoPublico } from '../middlewares/rateLimit';

export const analisesRoutes = Router();

analisesRoutes.post('/calcular', limitadorCalculoPublico, async (req: AuthRequest, res) => {
  try {
    const localizacao = LocalizacaoSchema.safeParse(req.body);
    if (!localizacao.success) {
      return res.status(400).json({
        sucesso: false,
        codigo_erro: 'E001_FALHA_VALIDACAO_ENTRADA',
        mensagem: localizacao.error.issues[0].message,
      });
    }

    const entrada = validarEntrada(req.body);
    const resultado = executarMotorCalagem(entrada);

    // Todo cálculo é registrado de forma anônima (alimenta o Monitoramento
    // Regional), mas só entra no histórico de alguém quando a pessoa clica
    // em "Salvar" (POST /:id/salvar). Se a gravação falhar, o cálculo ainda
    // é devolvido — só não poderá ser salvo.
    let id: string | null = null;
    try {
      const registro = await salvarAnalise({
        entrada,
        resultado,
        uf:                  localizacao.data.uf,
        cidade:              localizacao.data.cidade,
        modo_al_sat:         req.body.modo_al_sat,
        monitoramento_ativo: req.body.monitoramento_ativo,
        usuario_id:          null,
      });
      id = registro.id;
    } catch (err) {
      console.error('[analises] Falha ao salvar no banco:', err);
    }

    res.status(200).json({ sucesso: true, resultado, id });

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
    const dataAnalise = DataAnaliseSchema.safeParse(req.body.data_analise);
    if (!dataAnalise.success) {
      return res.status(400).json({ sucesso: false, mensagem: dataAnalise.error.issues[0].message });
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
        data_analise: dataAnalise.data,
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
    // ?arquivadas=true → área de análises arquivadas; padrão → só as ativas
    const arquivadas = filtroArquivadas(req.query.arquivadas);
    const usuarioFiltro = isAdmin ? undefined : req.userId;
    const calagens = await listarAnalises(usuarioFiltro, arquivadas);
    const adubacoes = await listarAnalisesAdubacaoHistorico(usuarioFiltro, arquivadas);

    // Nome do talhão vinculado (a coluna "Talhão" do histórico mostrava a
    // identificação livre, não o talhão de fato).
    const talhaoIds = [...new Set(
      [...calagens, ...adubacoes].map(a => a.talhao_id).filter((id): id is string => !!id)
    )];
    const nomesTalhao = new Map<string, string>();
    if (talhaoIds.length > 0) {
      const rows = await db.select({ id: talhoes.id, nome: talhoes.nome }).from(talhoes).where(inArray(talhoes.id, talhaoIds));
      for (const t of rows) nomesTalhao.set(t.id, t.nome);
    }
    const nomeTalhao = (id: string | null) => (id ? nomesTalhao.get(id) ?? null : null);

    const unified = [
      ...calagens.map(a => ({ ...a, tipo: 'CALAGEM', talhao_nome: nomeTalhao(a.talhao_id) })),
      ...adubacoes.map(a => ({ ...a, tipo: 'ADUBACAO', talhao_nome: nomeTalhao(a.talhao_id) }))
    ];

    unified.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

    res.status(200).json({ sucesso: true, dados: unified });
  } catch (error: any) {
    res.status(500).json({
      sucesso: false,
      codigo_erro: 'E003_ERRO_LISTAGEM',
      mensagem: 'Erro ao buscar histórico de análises.',
      detalhes: error?.message,
    });
  }
});

// ── Gerenciamento (só o dono) ─────────────────────────────────────────────────
// Rotas com :id ficam por último para não capturar /historico e /regional-stats.

// POST /api/analises/:id/salvar  →  leva um cálculo feito na calculadora
// (registro anônimo, recente) para o histórico do usuário logado.
analisesRoutes.post('/:id/salvar', verificarToken, async (req: AuthRequest, res) => {
  try {
    const dataAnalise = DataAnaliseSchema.safeParse(req.body?.data_analise);
    if (!dataAnalise.success) {
      return res.status(400).json({ sucesso: false, mensagem: dataAnalise.error.issues[0].message });
    }

    const talhaoId = typeof req.body?.talhao_id === 'string' && req.body.talhao_id ? req.body.talhao_id : null;
    if (talhaoId && !(await getTalhaoById(talhaoId, req.userId!))) {
      return res.status(404).json({ sucesso: false, mensagem: 'Talhão não encontrado.' });
    }

    const analise = await vincularAnaliseAoUsuario(req.params.id as string, req.userId!, {
      data_analise: dataAnalise.data,
      talhao_id: talhaoId,
    });
    if (!analise) {
      return res.status(404).json({ sucesso: false, mensagem: 'Cálculo não encontrado ou já salvo. Calcule novamente para salvar.' });
    }
    res.status(201).json({ sucesso: true, id: analise.id });
  } catch (error: any) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar análise.', detalhes: error?.message });
  }
});

// GET /api/analises/:id  →  análise completa (para abrir na edição)
analisesRoutes.get('/:id', verificarToken, async (req: AuthRequest, res) => {
  try {
    const analise = await buscarAnalisePorId(req.params.id as string, req.userId!);
    if (!analise) return res.status(404).json({ sucesso: false, mensagem: 'Análise não encontrada.' });
    res.json({ sucesso: true, dados: analise });
  } catch (error: any) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar análise.', detalhes: error?.message });
  }
});

// PUT /api/analises/:id  →  corrige os dados e recalcula com o motor,
// atualizando o mesmo registro (sem criar outro).
analisesRoutes.put('/:id', verificarToken, async (req: AuthRequest, res) => {
  try {
    const localizacao = LocalizacaoSchema.safeParse(req.body);
    if (!localizacao.success) {
      return res.status(400).json({ sucesso: false, codigo_erro: 'E001_FALHA_VALIDACAO_ENTRADA', mensagem: localizacao.error.issues[0].message });
    }
    const dataAnalise = DataAnaliseSchema.safeParse(req.body.data_analise);
    if (!dataAnalise.success) {
      return res.status(400).json({ sucesso: false, codigo_erro: 'E001_FALHA_VALIDACAO_ENTRADA', mensagem: dataAnalise.error.issues[0].message });
    }

    const entrada = validarEntrada(req.body);
    const resultado = executarMotorCalagem(entrada);

    const analise = await atualizarAnalise(req.params.id as string, req.userId!, {
      entrada,
      resultado,
      uf: localizacao.data.uf,
      cidade: localizacao.data.cidade,
      modo_al_sat: req.body.modo_al_sat,
      monitoramento_ativo: req.body.monitoramento_ativo,
      data_analise: dataAnalise.data,
    });
    if (!analise) return res.status(404).json({ sucesso: false, mensagem: 'Análise não encontrada.' });

    res.json({ sucesso: true, resultado, dados: analise });
  } catch (error: any) {
    if (error instanceof CalagemValidationError) {
      return res.status(400).json({ sucesso: false, codigo_erro: 'E001_FALHA_VALIDACAO_ENTRADA', mensagem: error.message });
    }
    res.status(500).json({ sucesso: false, codigo_erro: 'E002_ERRO_INTERNO', mensagem: 'Erro ao salvar a análise.', detalhes: error?.message });
  }
});

// DELETE /api/analises/:id  →  exclusão definitiva
analisesRoutes.delete('/:id', verificarToken, async (req: AuthRequest, res) => {
  try {
    const analise = await excluirAnalise(req.params.id as string, req.userId!);
    if (!analise) return res.status(404).json({ sucesso: false, mensagem: 'Análise não encontrada.' });
    res.json({ sucesso: true, id: analise.id });
  } catch (error: any) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir análise.', detalhes: error?.message });
  }
});

// PATCH /api/analises/:id/arquivar  →  { arquivada: true } arquiva, false restaura
analisesRoutes.patch('/:id/arquivar', verificarToken, async (req: AuthRequest, res) => {
  try {
    const dados = ArquivarAnaliseSchema.safeParse(req.body);
    if (!dados.success) return res.status(400).json({ sucesso: false, mensagem: dados.error.issues[0].message });

    const analise = await arquivarAnalise(req.params.id as string, req.userId!, dados.data.arquivada);
    if (!analise) return res.status(404).json({ sucesso: false, mensagem: 'Análise não encontrada.' });
    res.json({ sucesso: true, ...analise });
  } catch (error: any) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao arquivar análise.', detalhes: error?.message });
  }
});
