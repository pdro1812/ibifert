import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, or } from 'drizzle-orm';
import { db } from '../database/db';
import { users } from '../database/schema';
import { RegistroSchema, LoginSchema } from '../schemas/authSchema';

export const authRoutes = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Rota de Cadastro
authRoutes.post('/register', async (req, res) => {
  try {
    const dados = RegistroSchema.parse(req.body);

    // Verifica se email ou CPF já existem
    const existente = await db
      .select()
      .from(users)
      .where(or(eq(users.email, dados.email), eq(users.cpf, dados.cpf)))
      .limit(1);

    if (existente.length > 0) {
      return res.status(400).json({ erro: 'E-mail ou CPF já cadastrados.' });
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const [novoUsuario] = await db
      .insert(users)
      .values({
        nome:     dados.nome,
        cpf:      dados.cpf,
        email:    dados.email,
        cidade:   dados.cidade,
        estado:   dados.estado,
        telefone: dados.telefone,
        senha:    senhaHash,
      })
      .returning();

    const token = jwt.sign(
      { id: novoUsuario.id, role: novoUsuario.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      mensagem: 'Usuário criado com sucesso!',
      token,
      usuario: { id: novoUsuario.id, nome: novoUsuario.nome, email: novoUsuario.email },
    });

  } catch (error: any) {
    res.status(400).json({ erro: 'Falha no cadastro', detalhes: error.errors || error.message });
  }
});

// Rota de Login
authRoutes.post('/login', async (req, res) => {
  try {
    const dados = LoginSchema.parse(req.body);

    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.email, dados.email))
      .limit(1);

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const senhaValida = await bcrypt.compare(dados.senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id, role: usuario.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
    });

  } catch (error: any) {
    res.status(400).json({ erro: 'Falha no login', detalhes: error.errors || error.message });
  }
});