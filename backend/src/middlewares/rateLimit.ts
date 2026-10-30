import { rateLimit, type Options } from 'express-rate-limit';

// Contadores em memória: valem para uma única instância do backend e zeram
// ao reiniciar. O IP do cliente vem do X-Forwarded-For do nginx — depende
// do `trust proxy` configurado em server.ts.

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

function limitador(windowMs: number, limit: number, mensagem: string, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: mensagem },
    ...extra,
  });
}

// Teto geral por IP para toda a API (proteção contra abuso/automação)
export const limitadorGeralApi = limitador(
  15 * MINUTO, 1000,
  'Muitas requisições a partir deste endereço. Aguarde alguns minutos.'
);

// Login: só contam as tentativas que falharam (status >= 400)
export const limitadorLoginPorIp = limitador(
  15 * MINUTO, 20,
  'Muitas tentativas de login a partir deste endereço. Aguarde 15 minutos e tente novamente.',
  { skipSuccessfulRequests: true }
);

// Login: limite por conta, para frear tentativas de senha contra um mesmo
// e-mail vindas de vários IPs
export const limitadorLoginPorConta = limitador(
  15 * MINUTO, 5,
  'Muitas tentativas de login para esta conta. Aguarde 15 minutos e tente novamente.',
  {
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `login:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  }
);

export const limitadorCadastro = limitador(
  HORA, 5,
  'Muitos cadastros a partir deste endereço. Aguarde uma hora e tente novamente.'
);

export const limitadorExclusaoConta = limitador(
  HORA, 5,
  'Muitas tentativas de exclusão de conta. Aguarde uma hora e tente novamente.'
);

// Rotas públicas (sem login) que gravam no banco
export const limitadorFeedback = limitador(
  HORA, 10,
  'Muitos envios de feedback a partir deste endereço. Aguarde uma hora.'
);

export const limitadorCalculoPublico = limitador(
  15 * MINUTO, 100,
  'Muitos cálculos a partir deste endereço. Aguarde alguns minutos.'
);
