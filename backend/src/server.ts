import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRoutes }    from './routes/authRoutes';
import { analisesRoutes } from './routes/analisesRoutes';
import { adubacaoRoutes } from './routes/adubacaoRoutes';
import { fazendasRouter } from './routes/fazendasRoutes';
import { adminRoutes }    from './routes/adminRoutes';


const app = express();

// CORS_ORIGIN: lista de origens permitidas separadas por vírgula (ex.:
// "https://app.ibiferti.com,https://ibiferti.com"). Sem essa variável,
// mantém o comportamento atual (qualquer origem) até o domínio de
// produção ser definido.
const origensPermitidas = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
app.use(cors(origensPermitidas ? { origin: origensPermitidas } : undefined));

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Ibiferti Backend - Motor Agronômico rodando!' });
});

app.use('/api/auth',     authRoutes);
app.use('/api/analises', analisesRoutes);
app.use('/api/adubacao', adubacaoRoutes);
app.use('/api/fazendas', fazendasRouter);
app.use('/api/admin',    adminRoutes);


app.listen(3000, () => {
  console.log('🚀 Backend rodando na porta 3000');
});