import { Router } from 'express';
import { count, eq, isNull, isNotNull, sql, desc, inArray } from 'drizzle-orm';
import { db } from '../database/db';
import { users, analises, fazendas, talhoes } from '../database/schema';
import { verificarToken, verificarRole, AuthRequest } from '../middlewares/authMiddleware';

export const adminRoutes = Router();

// Todas as rotas de admin exigem token e papel de ADMIN
adminRoutes.use(verificarToken, verificarRole(['ADMIN']));

adminRoutes.get('/stats', async (req: AuthRequest, res) => {
  try {
    // 1. Total de Usuários
    const [totalUsers] = await db.select({ value: count() }).from(users);

    // 2. Total de Amostras (Total, Logados, Convidados)
    const [totalAnalises] = await db.select({ value: count() }).from(analises);
    const [loggedAnalises] = await db.select({ value: count() }).from(analises).where(isNotNull(analises.usuario_id));
    const [guestAnalises] = await db.select({ value: count() }).from(analises).where(isNull(analises.usuario_id));

    // 3. Amostras por UF
    const analisesPorUF = await db
      .select({
        uf: analises.uf,
        quantidade: count(),
      })
      .from(analises)
      .groupBy(analises.uf)
      .orderBy(desc(count()));

    // 4. Amostras por Sistema de Manejo
    const analisesPorSistema = await db
      .select({
        sistema: analises.sistema_manejo,
        quantidade: count(),
      })
      .from(analises)
      .groupBy(analises.sistema_manejo);

    // 5. Últimos Usuários Cadastrados
    const ultimosUsuarios = await db
      .select({
        id: users.id,
        nome: users.nome,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(5);

    res.status(200).json({
      usuarios: {
        total: totalUsers.value,
        recentes: ultimosUsuarios,
      },
      analises: {
        total: totalAnalises.value,
        logados: loggedAnalises.value,
        convidados: guestAnalises.value,
        porUF: analisesPorUF,
        porSistema: analisesPorSistema,
      }
    });
  } catch (error: any) {
    console.error('[admin] Erro ao buscar estatísticas:', error);
    res.status(500).json({
      erro: 'Falha ao buscar estatísticas do sistema.',
      detalhes: error.message,
    });
  }
});

// Listar todos os usuários com contagem de análises
adminRoutes.get('/users', async (req, res) => {
  try {
    const listaUsuarios = await db
      .select({
        id: users.id,
        nome: users.nome,
        email: users.email,
        cpf: users.cpf,
        cidade: users.cidade,
        estado: users.estado,
        role: users.role,
        createdAt: users.createdAt,
        totalAnalises: count(analises.id),
      })
      .from(users)
      .leftJoin(analises, eq(users.id, analises.usuario_id))
      .groupBy(users.id)
      .orderBy(sql`${users.createdAt} DESC`);

    res.status(200).json(listaUsuarios);
  } catch (error: any) {
    res.status(500).json({ erro: 'Erro ao listar usuários', detalhes: error.message });
  }
});

// Listar todas as análises do sistema (Logados + Convidados)
adminRoutes.get('/analises', async (req, res) => {
  try {
    const todasAnalises = await db
      .select({
        // Selecionando explicitamente as colunas para evitar o erro de sintaxe do Drizzle
        id: analises.id,
        criado_em: analises.criado_em,
        uf: analises.uf,
        cidade: analises.cidade,
        identificacao: analises.identificacao,
        sistema_manejo: analises.sistema_manejo,
        primeira_calagem: analises.primeira_calagem,
        PRNT: analises.PRNT,
        pH_agua: analises.pH_agua,
        SMP: analises.SMP,
        MO: analises.MO,
        Al_trocavel: analises.Al_trocavel,
        V_atual: analises.V_atual,
        CTC_pH7: analises.CTC_pH7,
        Al_sat: analises.Al_sat,
        NC_ajustada: analises.NC_ajustada,
        metodo_calc_roteado: analises.metodo_calc_roteado,
        modo_aplicacao: analises.modo_aplicacao,
        profundidade_cm: analises.profundidade_cm,
        alertas: analises.alertas,
        usuario_id: analises.usuario_id,
        usuario_nome: users.nome,
        usuario_email: users.email,
      })
      .from(analises)
      .leftJoin(users, eq(analises.usuario_id, users.id))
      .orderBy(desc(analises.criado_em));

    res.status(200).json(todasAnalises);
  } catch (error: any) {
    console.error('[admin] Erro ao listar análises:', error);
    res.status(500).json({ erro: 'Erro ao listar todas as análises', detalhes: error.message });
  }
});

// Listar detalhes completos de um usuário (Fazendas -> Talhões -> Análises)
adminRoutes.get('/users/:id/full-details', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Buscar Fazendas do Usuário
    const userFazendas = await db
      .select()
      .from(fazendas)
      .where(eq(fazendas.usuario_id, id))
      .orderBy(desc(fazendas.criado_em));

    // 2. Buscar Talhões das Fazendas
    const fazendasIds = userFazendas.map(f => f.id);
    let allTalhoes: any[] = [];
    if (fazendasIds.length > 0) {
      allTalhoes = await db
        .select()
        .from(talhoes)
        .where(inArray(talhoes.fazenda_id, fazendasIds))
        .orderBy(desc(talhoes.criado_em));
    }

    // 3. Buscar todas as Análises do Usuário
    const userAnalises = await db
      .select()
      .from(analises)
      .where(eq(analises.usuario_id, id))
      .orderBy(desc(analises.criado_em));

    res.status(200).json({
      fazendas: userFazendas,
      talhoes: allTalhoes,
      analises: userAnalises,
    });
  } catch (error: any) {
    console.error('[admin] Erro ao buscar detalhes completos do usuário:', error);
    res.status(500).json({ erro: 'Erro ao buscar detalhes do usuário', detalhes: error.message });
  }
});
