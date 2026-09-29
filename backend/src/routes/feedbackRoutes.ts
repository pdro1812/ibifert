// backend/src/routes/feedbackRoutes.ts

import { Router } from 'express';
import { CriarFeedbackSchema } from '../schemas/feedbackSchema';
import { createFeedback } from '../database/feedback';

export const feedbackRouter = Router();

// POST /api/feedback  →  qualquer pessoa pode enviar, sem precisar estar logada
feedbackRouter.post('/', async (req, res) => {
  try {
    const dados = CriarFeedbackSchema.parse(req.body);
    const feedback = await createFeedback(dados);
    res.status(201).json(feedback);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Erro de validação', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar feedback.' });
  }
});
