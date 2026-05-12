// backend/src/routes/fazendasRoutes.ts

import { Router } from 'express';
import { verificarToken } from '../middlewares/authMiddleware';
import type { AuthRequest } from '../middlewares/authMiddleware';
import {
  createFazenda,
  deleteFazenda,
  getFazendasByUsuario,
  createTalhao,
  deleteTalhao,
  getTalhoesByFazenda,
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
    res.status(500).json({ error: 'Erro ao buscar fazendas.' });
  }
});

// POST /api/fazendas  →  cria uma fazenda vinculada ao usuário logado
fazendasRouter.post('/', async (req, res) => {
  try {
    const usuarioId = (req as AuthRequest).userId as string;
    const { nome, municipio, uf } = req.body as {
      nome: string;
      municipio: string;
      uf: string;
    };

    if (!nome || !municipio || !uf) {
      return res.status(400).json({ error: 'nome, municipio e uf são obrigatórios.' });
    }

    const fazenda = await createFazenda({ usuario_id: usuarioId, nome, municipio, uf });
    res.status(201).json(fazenda);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar fazenda.' });
  }
});

// DELETE /api/fazendas/:id  →  remove fazenda e seus talhões
fazendasRouter.delete('/:id', async (req, res) => {
  try {
    const fazenda = await deleteFazenda(req.params.id);
    if (!fazenda) return res.status(404).json({ error: 'Fazenda não encontrada.' });
    res.json(fazenda);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar fazenda.' });
  }
});

// ── Talhoes ───────────────────────────────────────────────────────────────────

// POST /api/fazendas/:fazendaId/talhoes  →  cria talhão vinculado à fazenda
fazendasRouter.post('/:fazendaId/talhoes', async (req, res) => {
  try {
    const { fazendaId } = req.params;
    const { nome, cultura } = req.body as { nome: string; cultura: string };

    if (!nome || !cultura) {
      return res.status(400).json({ error: 'nome e cultura são obrigatórios.' });
    }

    const talhao = await createTalhao({ fazenda_id: fazendaId, nome, cultura });
    res.status(201).json(talhao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar talhão.' });
  }
});

// DELETE /api/fazendas/talhoes/:id  →  remove talhão
fazendasRouter.delete('/talhoes/:id', async (req, res) => {
  try {
    const talhao = await deleteTalhao(req.params.id);
    if (!talhao) return res.status(404).json({ error: 'Talhão não encontrado.' });
    res.json(talhao);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar talhão.' });
  }
});