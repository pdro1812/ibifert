import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRoutes }    from './routes/authRoutes';
import { analisesRoutes } from './routes/analisesRoutes';
import { adubacaoRoutes } from './routes/adubacaoRoutes';
import { fazendasRouter } from './routes/fazendasRoutes';
import { adminRoutes }    from './routes/adminRoutes';
import { standaloneRoutes } from './routes/standaloneRoutes';


const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Ibiferti Backend - Motor Agronômico rodando!' });
});

app.use('/api/auth',     authRoutes);
app.use('/api/analises', analisesRoutes);
app.use('/api/adubacao', adubacaoRoutes);
app.use('/api/fazendas', fazendasRouter);
app.use('/api/admin',    adminRoutes);
app.use('/api/standalone', standaloneRoutes);


app.listen(3000, () => {
  console.log('🚀 Backend rodando na porta 3000');
});