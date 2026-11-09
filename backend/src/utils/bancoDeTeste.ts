import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { Pool } from 'pg';
import { migrarBanco } from '../database/migrar';

// Postgres descartável (PGlite em memória) para os testes de rota: aplica as
// migrações de drizzle/ com o migrador do start (database/migrar.ts),
// e sobe o app real (src/app.ts) apontando para ele. Nada toca banco real.

const PORTA_BANCO = 54329;
const urlBanco = () => `postgres://postgres:postgres@127.0.0.1:${PORTA_BANCO}/postgres?sslmode=disable`;

export interface AmbienteDeTeste {
  url: string;
  fechar: () => Promise<void>;
}

// Banco novo recebe as migrações pelo mesmo migrador do start do container.
async function subirBanco(): Promise<PGLiteSocketServer> {
  const db = await PGlite.create();
  const servidor = new PGLiteSocketServer({ db, port: PORTA_BANCO, host: '127.0.0.1' });
  await servidor.start();
  const pool = new Pool({ connectionString: urlBanco(), max: 1 });
  try {
    await migrarBanco(pool, { log: () => undefined });
  } finally {
    await pool.end();
  }
  return servidor;
}

export async function subirAmbienteDeTeste(): Promise<AmbienteDeTeste> {
  const banco = await subirBanco();
  // db.ts lê DATABASE_URL ao ser importado: o app só é carregado depois.
  process.env.DATABASE_URL = urlBanco();
  process.env.JWT_SECRET ??= 'segredo-apenas-para-testes';
  const { app } = await import('../app');
  const { db } = await import('../database/db');

  const http: Server = app.listen(0);
  await new Promise((resolve) => http.once('listening', resolve));
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}/api`;

  return {
    url,
    fechar: async () => {
      http.closeAllConnections();
      await new Promise((resolve) => http.close(resolve));
      await db.$client.end();
      await banco.stop();
    },
  };
}

// Cliente HTTP dos testes. Cada requisição sai com um X-Forwarded-For
// próprio (aceito porque vem de loopback) para os rate limits por IP não
// interferirem entre casos.
let sequenciaIp = 1;

export interface Resposta {
  status: number;
  corpo: any;
  cookie: string;
}

export function clienteDeTeste(url: string) {
  return async function requisitar(
    metodo: string,
    caminho: string,
    { corpo, cookie }: { corpo?: unknown; cookie?: string } = {}
  ): Promise<Resposta> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': `198.51.100.${sequenciaIp++ % 250}`,
    };
    if (cookie) headers.Cookie = cookie;

    const r = await fetch(url + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const texto = await r.text();
    let json: unknown = texto;
    try { json = JSON.parse(texto); } catch { /* corpo não-JSON fica como texto */ }
    return { status: r.status, corpo: json, cookie: (r.headers.get('set-cookie') ?? '').split(';')[0] };
  };
}

export const SENHA_TESTE = 'Senha#Forte123';

export async function cadastrar(requisitar: ReturnType<typeof clienteDeTeste>, email: string): Promise<string> {
  const r = await requisitar('POST', '/auth/register', {
    corpo: { nome: `Usuário ${email}`, cidade: 'Ibirubá', estado: 'RS', email, senha: SENHA_TESTE },
  });
  if (r.status !== 201) throw new Error(`cadastro de ${email} falhou: ${r.status} ${JSON.stringify(r.corpo)}`);
  return r.cookie;
}
