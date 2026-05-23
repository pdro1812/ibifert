import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Estendendo o Request do Express para embutir o ID e Role do usuário logado
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function verificarToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ erro: 'Token não fornecido.' });
    return;
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key') as { id: string; role: string };
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
    return;
  }
}

export function verificarRole(rolesPermitidas: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !rolesPermitidas.includes(req.userRole)) {
      res.status(403).json({ erro: 'Acesso negado. Você não tem permissão para acessar este recurso.' });
      return;
    }
    next();
  };
}