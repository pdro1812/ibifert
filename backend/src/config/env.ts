const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente. Aplicação não pode iniciar.');
}

// Em produção, um segredo fraco permite forjar tokens (inclusive de ADMIN).
// O valor antigo do docker-compose (que ficou público) tem menos de 32 e é recusado.
if (process.env.NODE_ENV === 'production' && secret.length < 32) {
  throw new Error('JWT_SECRET fraco ou padrão em produção (mínimo 32 caracteres). Gere um novo: openssl rand -hex 32');
}

export const JWT_SECRET: string = secret;
