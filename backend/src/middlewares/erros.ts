import type { ErrorRequestHandler, Request, RequestParamHandler, Response } from 'express';
import { z } from 'zod';

export const MENSAGEM_ERRO_INTERNO = 'Erro interno. Tente novamente mais tarde.';

// Erro inesperado (banco, bug): o detalhe fica só no log do servidor. A
// resposta nunca leva error.message, que pode trazer a query SQL e os
// parâmetros (inclusive ids de usuário).
export function responderErroInterno(req: Request, res: Response, error: unknown, corpo: Record<string, unknown>) {
  console.error(`[api] ${req.method} ${req.originalUrl}:`, error);
  return res.status(500).json(corpo);
}

// Os ids do banco são UUID: um valor fora desse formato nunca existe, então
// responde 404 antes de o Postgres falhar com "invalid input syntax for type uuid".
const IdSchema = z.guid();

export function ehId(valor: unknown): valor is string {
  return IdSchema.safeParse(valor).success;
}

export function exigirIdValido(corpo404: Record<string, unknown>): RequestParamHandler {
  return (_req, res, next, valor) => {
    if (ehId(valor)) return next();
    res.status(404).json(corpo404);
  };
}

// Último middleware do app: corpo JSON inválido ou grande demais vira 4xx em
// JSON; qualquer outro erro que escapou das rotas vira 500 genérico.
export const tratarErro: ErrorRequestHandler = (err, req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ erro: 'JSON inválido.' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ erro: 'Requisição grande demais.' });
    return;
  }
  responderErroInterno(req, res, err, { erro: MENSAGEM_ERRO_INTERNO });
};
