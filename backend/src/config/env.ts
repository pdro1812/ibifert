const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente. Aplicação não pode iniciar.');
}

export const JWT_SECRET: string = secret;
