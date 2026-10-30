import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express, { type RequestHandler } from 'express';

// env.ts exige JWT_SECRET já na importação
process.env.JWT_SECRET ??= 'segredo-apenas-para-testes';

async function subirApp(montar: (app: express.Express) => void) {
  const app = express();
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(express.json());
  montar(app);
  const servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  return { url, fechar: () => servidor.close() };
}

const falhaLogin: RequestHandler = (_req, res) => { res.status(401).json({ erro: 'Credenciais inválidas.' }); };

function postar(url: string, corpo: object, headers: Record<string, string> = {}) {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(corpo) });
}

test('Senha do cadastro', async (t) => {
  const { RegistroSchema } = await import('../schemas/authSchema');
  const base = { nome: 'Fulano', cidade: 'Ibirubá', estado: 'RS', email: 'a@b.com' };

  await t.test('aceita senha forte', () => {
    assert.equal(RegistroSchema.safeParse({ ...base, senha: 'Adubo#2026' }).success, true);
  });

  for (const [caso, senha] of [
    ['curta', 'Ab1#xyz'], ['sem maiúscula', 'adubo#2026'], ['sem minúscula', 'ADUBO#2026'],
    ['sem número', 'Adubo#Solo'], ['sem especial', 'Adubo2026'],
  ]) {
    await t.test(`rejeita senha ${caso}`, () => {
      assert.equal(RegistroSchema.safeParse({ ...base, senha }).success, false);
    });
  }
});

test('Sessão por cookie httpOnly', async (t) => {
  const { verificarToken, obterUsuarioOpcional, gerarTokenSessao, NOME_COOKIE_SESSAO } = await import('../middlewares/authMiddleware');
  const token = gerarTokenSessao({ id: 'usuario-1', role: 'PRODUTOR' });
  const { url, fechar } = await subirApp((app) => {
    app.get('/privado', verificarToken, (req, res) => { res.json({ id: (req as { userId?: string }).userId }); });
    app.get('/publico', (req, res) => { res.json({ id: obterUsuarioOpcional(req) }); });
  });

  try {
    await t.test('aceita o token vindo do cookie', async () => {
      const r = await fetch(`${url}/privado`, { headers: { Cookie: `outro=1; ${NOME_COOKIE_SESSAO}=${token}` } });
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), { id: 'usuario-1' });
    });

    await t.test('continua aceitando o header Authorization', async () => {
      const r = await fetch(`${url}/privado`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(r.status, 200);
    });

    await t.test('recusa sem token e com token adulterado', async () => {
      assert.equal((await fetch(`${url}/privado`)).status, 401);
      const r = await fetch(`${url}/privado`, { headers: { Cookie: `${NOME_COOKIE_SESSAO}=${token}x` } });
      assert.equal(r.status, 401);
    });

    await t.test('rota pública identifica o usuário só com sessão válida', async () => {
      assert.deepEqual(await (await fetch(`${url}/publico`)).json(), { id: null });
      const r = await fetch(`${url}/publico`, { headers: { Cookie: `${NOME_COOKIE_SESSAO}=${token}` } });
      assert.deepEqual(await r.json(), { id: 'usuario-1' });
    });
  } finally {
    fechar();
  }
});

test('Rate limit do login', async (t) => {
  const { limitadorLoginPorIp, limitadorLoginPorConta } = await import('../middlewares/rateLimit');

  await t.test('bloqueia a 6ª tentativa errada para a mesma conta, mesmo trocando de IP', async () => {
    const { url, fechar } = await subirApp((app) => app.post('/login', limitadorLoginPorConta, falhaLogin));
    try {
      for (let i = 1; i <= 5; i++) {
        const r = await postar(`${url}/login`, { email: 'Vitima@Ex.com' }, { 'X-Forwarded-For': `10.9.0.${i}` });
        assert.equal(r.status, 401);
      }
      const bloqueado = await postar(`${url}/login`, { email: 'vitima@ex.com ' }, { 'X-Forwarded-For': '10.9.0.99' });
      assert.equal(bloqueado.status, 429);
      const outraConta = await postar(`${url}/login`, { email: 'outra@ex.com' });
      assert.equal(outraConta.status, 401);
    } finally {
      fechar();
    }
  });

  await t.test('limita por IP real (X-Forwarded-For do proxy), sem bloquear outros IPs', async () => {
    const { url, fechar } = await subirApp((app) => app.post('/login', limitadorLoginPorIp, falhaLogin));
    try {
      for (let i = 0; i < 20; i++) {
        const r = await postar(`${url}/login`, { email: `x${i}@ex.com` }, { 'X-Forwarded-For': '200.1.1.1' });
        assert.equal(r.status, 401);
      }
      const bloqueado = await postar(`${url}/login`, { email: 'y@ex.com' }, { 'X-Forwarded-For': '200.1.1.1' });
      assert.equal(bloqueado.status, 429);
      const outroIp = await postar(`${url}/login`, { email: 'y@ex.com' }, { 'X-Forwarded-For': '200.2.2.2' });
      assert.equal(outroIp.status, 401);
    } finally {
      fechar();
    }
  });

  await t.test('login com sucesso não consome tentativas', async () => {
    const { url, fechar } = await subirApp((app) =>
      app.post('/login', limitadorLoginPorConta, (_req, res) => { res.json({ ok: true }); }));
    try {
      for (let i = 0; i < 10; i++) {
        assert.equal((await postar(`${url}/login`, { email: 'ok@ex.com' })).status, 200);
      }
    } finally {
      fechar();
    }
  });
});
