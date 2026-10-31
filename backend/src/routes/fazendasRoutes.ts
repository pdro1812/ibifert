// backend/src/routes/fazendasRoutes.ts

import { Router } from 'express';
import { verificarToken } from '../middlewares/authMiddleware';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { CriarFazendaSchema, CriarTalhaoSchema } from '../schemas/fazendasSchema';
import {
  createFazenda,
  deleteFazenda,
  updateFazenda,
  getFazendasByUsuario,
  getFazendaPorIdEUsuario,
  createTalhao,
  deleteTalhao,
  updateTalhao,
  getTalhoesByFazenda,
  getTalhaoById,
  getAnalisesByTalhao,
} from '../database/fazendas';

export const fazendasRouter = Router();

fazendasRouter.use(verificarToken);

// ── Fazendas ──────────────────────────────────────────────────────────────────

// GET /api/fazendas  →  lista todas as fazendas do usuário logado
fazendasRouter.get('/', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const rows = await getFazendasByUsuario(usuarioId);

    // Para cada fazenda, busca os talhões e aninha no objeto
    const result = await Promise.all(
      rows.map(async (fazenda) => ({
        ...fazenda,
        talhoes: await getTalhoesByFazenda(fazenda.id),
      }))
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar propriedades.' });
  }
});

// POST /api/fazendas  →  cria uma fazenda vinculada ao usuário logado
fazendasRouter.post('/', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const { nome, municipio, uf } = CriarFazendaSchema.parse(req.body);

    const fazenda = await createFazenda({ usuario_id: usuarioId, nome, municipio, uf });
    res.status(201).json(fazenda);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Erro de validação', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar propriedade.' });
  }
});

// PUT /api/fazendas/:id  →  edita nome, município e UF (só do dono)
fazendasRouter.put('/:id', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const dados = CriarFazendaSchema.safeParse(req.body);
    if (!dados.success) {
      return res.status(400).json({ error: dados.error.issues[0].message });
    }

    const fazenda = await updateFazenda(req.params.id, usuarioId, dados.data);
    if (!fazenda) return res.status(404).json({ error: 'Propriedade não encontrada.' });
    res.json(fazenda);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao editar propriedade.' });
  }
});

// DELETE /api/fazendas/:id  →  remove fazenda e seus talhões (só do dono)
fazendasRouter.delete('/:id', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const fazenda = await deleteFazenda(req.params.id, usuarioId);
    if (!fazenda) return res.status(404).json({ error: 'Propriedade não encontrada.' });
    res.json(fazenda);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover propriedade.' });
  }
});

// ── Talhoes ───────────────────────────────────────────────────────────────────

// POST /api/fazendas/:fazendaId/talhoes  →  cria talhão vinculado à fazenda (só do dono)
fazendasRouter.post('/:fazendaId/talhoes', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const { fazendaId } = req.params;
    const { nome, cultura } = CriarTalhaoSchema.parse(req.body);

    const fazenda = await getFazendaPorIdEUsuario(fazendaId, usuarioId);
    if (!fazenda) return res.status(404).json({ error: 'Propriedade não encontrada.' });

    const talhao = await createTalhao({ fazenda_id: fazendaId, nome, cultura });
    res.status(201).json(talhao);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Erro de validação', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar talhão.' });
  }
});

// PUT /api/fazendas/talhoes/:id  →  edita nome e cultura do talhão (só do dono)
fazendasRouter.put('/talhoes/:id', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const dados = CriarTalhaoSchema.safeParse(req.body);
    if (!dados.success) {
      return res.status(400).json({ error: dados.error.issues[0].message });
    }

    const talhao = await updateTalhao(req.params.id, usuarioId, dados.data);
    if (!talhao) return res.status(404).json({ error: 'Talhão não encontrado.' });
    res.json(talhao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao editar talhão.' });
  }
});

// DELETE /api/fazendas/talhoes/:id  →  remove talhão (só do dono)
fazendasRouter.delete('/talhoes/:id', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const talhao = await deleteTalhao(req.params.id, usuarioId);
    if (!talhao) return res.status(404).json({ error: 'Talhão não encontrado.' });
    res.json(talhao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar talhão.' });
  }
});

// GET /api/fazendas/talhoes/:id  →  busca detalhes de um talhão (só do dono)
fazendasRouter.get('/talhoes/:id', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const talhao = await getTalhaoById(req.params.id, usuarioId);
    if (!talhao) return res.status(404).json({ error: 'Talhão não encontrado.' });
    res.json(talhao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar talhão.' });
  }
});

// GET /api/fazendas/talhoes/:id/analises  →  busca histórico de análises de um talhão (só do dono)
fazendasRouter.get('/talhoes/:id/analises', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const talhao = await getTalhaoById(req.params.id, usuarioId);
    if (!talhao) return res.status(404).json({ error: 'Talhão não encontrado.' });

    const rows = await getAnalisesByTalhao(req.params.id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar análises do talhão.' });
  }
});