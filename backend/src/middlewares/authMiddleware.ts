import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Estendendo o Request do Express para embutir o ID do usuário logado
export interface AuthRequest extends Request {
  userId?: string;
}

export function verificarToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ erro: 'Token não fornecido.' });
    return;
  }

  const [, token] = authHeader.split(' ');

  try {
    // DICA: No futuro, mova o 'super-secret-key' para o seu arquivo .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key') as { id: string };
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
    return;
  }
}