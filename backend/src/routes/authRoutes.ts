import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { eq, inArray, or } from 'drizzle-orm';
import { db } from '../database/db';
import { users, analises, analisesAdubacao, fazendas, talhoes } from '../database/schema';
import { RegistroSchema, LoginSchema, ExcluirContaSchema, LocalidadePreferencialSchema } from '../schemas/authSchema';
import {
  AuthRequest, verificarToken, gerarTokenSessao, definirCookieSessao, limparCookieSessao,
} from '../middlewares/authMiddleware';
import {
  limitadorCadastro, limitadorLoginPorIp, limitadorLoginPorConta, limitadorExclusaoConta,
} from '../middlewares/rateLimit';

export const authRoutes = Router();

// Comparado quando o e-mail não existe, para o tempo de resposta não revelar
// se a conta está cadastrada.
const HASH_FICTICIO = bcrypt.hashSync('senha-ficticia-para-tempo-constante', 10);

// Dados do usuário devolvidos ao frontend (cidade/estado = perfil regional,
// usado para pré-preencher a localização nos cálculos).
function usuarioPublico(u: { id: string; nome: string; email: string; role: string; cidade: string; estado: string }) {
  return { id: u.id, nome: u.nome, email: u.email, role: u.role, cidade: u.cidade, estado: u.estado };
}

function responderErroValidacao(res: Response, erro: string, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ erro, detalhes: error.issues });
  }
  console.error(`${erro}:`, error);
  return res.status(500).json({ erro: 'Erro interno. Tente novamente mais tarde.' });
}

// Rota de Cadastro
authRoutes.post('/register', limitadorCadastro, async (req, res) => {
  try {
    const dados = RegistroSchema.parse(req.body);

    // Verifica se email já existe
    const existente = await db
      .select()
      .from(users)
      .where(eq(users.email, dados.email))
      .limit(1);

    if (existente.length > 0) {
      return res.status(400).json({ erro: 'E-mail já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const [novoUsuario] = await db
      .insert(users)
      .values({
        nome:     dados.nome,
        email:    dados.email,
        cidade:   dados.cidade,
        estado:   dados.estado,
        telefone: dados.telefone,
        senha:    senhaHash,
      })
      .returning();

    definirCookieSessao(res, gerarTokenSessao(novoUsuario));

    res.status(201).json({
      mensagem: 'Usuário criado com sucesso!',
      usuario: usuarioPublico(novoUsuario),
    });

  } catch (error) {
    responderErroValidacao(res, 'Falha no cadastro', error);
  }
});

// Rota de Login
authRoutes.post('/login', limitadorLoginPorIp, limitadorLoginPorConta, async (req, res) => {
  try {
    const dados = LoginSchema.parse(req.body);

    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.email, dados.email))
      .limit(1);

    const senhaValida = await bcrypt.compare(dados.senha, usuario?.senha ?? HASH_FICTICIO);
    if (!usuario || !senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    definirCookieSessao(res, gerarTokenSessao(usuario));

    res.status(200).json({
      usuario: usuarioPublico(usuario),
    });

  } catch (error) {
    responderErroValidacao(res, 'Falha no login', error);
  }
});

authRoutes.post('/logout', (_req, res) => {
  limparCookieSessao(res);
  res.status(204).end();
});

// Restaura a sessão ao recarregar a página (o token não é legível pelo frontend)
authRoutes.get('/me', verificarToken, async (req: AuthRequest, res) => {
  const [usuario] = await db
    .select({ id: users.id, nome: users.nome, email: users.email, role: users.role, cidade: users.cidade, estado: users.estado })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  if (!usuario) {
    limparCookieSessao(res);
    return res.status(401).json({ erro: 'Sessão inválida.' });
  }
  res.json({ usuario });
});

// Perfil regional (localidade preferencial): só cidade e estado, sem exigir
// os demais dados do cadastro. Não mexe em análises já feitas.
authRoutes.patch('/me/localidade', verificarToken, async (req: AuthRequest, res) => {
  try {
    const dados = LocalidadePreferencialSchema.parse(req.body);
    const [usuario] = await db
      .update(users)
      .set({ cidade: dados.cidade, estado: dados.estado })
      .where(eq(users.id, req.userId!))
      .returning();

    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json({ usuario: usuarioPublico(usuario) });
  } catch (error) {
    responderErroValidacao(res, 'Falha ao salvar o perfil regional', error);
  }
});

// Exclusão da própria conta e de todos os dados ligados a ela (LGPD — item 7)
authRoutes.delete('/conta', limitadorExclusaoConta, verificarToken, async (req: AuthRequest, res) => {
  try {
    const { senha } = ExcluirContaSchema.parse(req.body);

    const [usuario] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!usuario) {
      limparCookieSessao(res);
      return res.status(401).json({ erro: 'Sessão inválida.' });
    }
    if (usuario.role === 'ADMIN') {
      return res.status(403).json({ erro: 'Contas de administrador não podem ser excluídas por aqui.' });
    }
    if (!(await bcrypt.compare(senha, usuario.senha))) {
      return res.status(400).json({ erro: 'Senha incorreta.' });
    }

    await db.transaction(async (tx) => {
      const fazendasDoUsuario = tx.select({ id: fazendas.id }).from(fazendas).where(eq(fazendas.usuario_id, usuario.id));
      const talhoesDoUsuario = tx.select({ id: talhoes.id }).from(talhoes).where(inArray(talhoes.fazenda_id, fazendasDoUsuario));

      await tx.delete(analises).where(or(eq(analises.usuario_id, usuario.id), inArray(analises.talhao_id, talhoesDoUsuario)));
      await tx.delete(analisesAdubacao).where(or(eq(analisesAdubacao.usuario_id, usuario.id), inArray(analisesAdubacao.talhao_id, talhoesDoUsuario)));
      await tx.delete(talhoes).where(inArray(talhoes.fazenda_id, fazendasDoUsuario));
      await tx.delete(fazendas).where(eq(fazendas.usuario_id, usuario.id));
      await tx.delete(users).where(eq(users.id, usuario.id));
    });

    limparCookieSessao(res);
    res.status(204).end();

  } catch (error) {
    responderErroValidacao(res, 'Falha ao excluir a conta', error);
  }
});
