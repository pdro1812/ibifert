import 'dotenv/config'; // Isso injeta as variáveis do .env no process.env
import express from 'express';
import cors from 'cors';
import { executarMotorCalagem } from './services/motorCalagem';
import { validarEntrada } from './services/calculadoraCalagem';
import { CalagemValidationError } from './schemas/calagemSchema';
import { authRoutes } from './routes/authRoutes';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Ibiferti Backend - Motor Agronômico rodando!' });
});

app.post('/api/calcular', (req, res) => {
  try {
    const entrada = validarEntrada(req.body);
    const resultado = executarMotorCalagem(entrada);

    res.status(200).json({ sucesso: true, resultado });

  } catch (error: any) {
    if (error instanceof CalagemValidationError) {
      res.status(400).json({
        sucesso: false,
        codigo_erro: 'E001_FALHA_VALIDACAO_ENTRADA',
        mensagem: error.message,
      });
    } else {
      res.status(500).json({
        sucesso: false,
        codigo_erro: 'E002_ERRO_INTERNO',
        mensagem: 'Erro inesperado no motor de cálculo.',
        detalhes: error?.message,
      });
    }
  }
});

app.use('/api/auth', authRoutes);

app.listen(3000, () => {
  console.log('🚀 Backend rodando na porta 3000');
});
