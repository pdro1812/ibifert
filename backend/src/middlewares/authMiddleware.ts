import { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

// Estendendo o Request do Express para embutir o ID e Role do usuário logado
export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

// A sessão fica num cookie httpOnly (inacessível ao JavaScript da página,
// protegido contra roubo por XSS), em vez de localStorage — item 7 do registro.
export const NOME_COOKIE_SESSAO = 'ibiferti_sessao';
const DURACAO_SESSAO_MS = 7 * 24 * 60 * 60 * 1000;

const opcoesBaseCookie: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api',
};

export function gerarTokenSessao(usuario: { id: string; role: string }): string {
  return jwt.sign({ id: usuario.id, role: usuario.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function definirCookieSessao(res: Response, token: string): void {
  res.cookie(NOME_COOKIE_SESSAO, token, { ...opcoesBaseCookie, maxAge: DURACAO_SESSAO_MS });
}

export function limparCookieSessao(res: Response): void {
  res.clearCookie(NOME_COOKIE_SESSAO, opcoesBaseCookie);
}

// Cookie de sessão primeiro; o header Authorization continua aceito para
// clientes de API (scripts, testes).
function extrairToken(req: Request): string | undefined {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [nome, ...valor] = parte.trim().split('=');
    if (nome === NOME_COOKIE_SESSAO && valor.length > 0) {
      return decodeURIComponent(valor.join('='));
    }
  }

  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  return tipo === 'Bearer' && token ? token : undefined;
}

function decodificarToken(req: Request): { id: string; role: string } | null {
  const token = extrairToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
  } catch {
    return null;
  }
}

// Para rotas públicas que só associam o resultado ao usuário quando há sessão
export function obterUsuarioOpcional(req: Request): string | null {
  return decodificarToken(req)?.id ?? null;
}

export function verificarToken(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!extrairToken(req)) {
    res.status(401).json({ erro: 'Token não fornecido.' });
    return;
  }

  const decoded = decodificarToken(req);
  if (!decoded) {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
    return;
  }

  req.userId = decoded.id;
  req.userRole = decoded.role;
  next();
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
