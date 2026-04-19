import express from 'express';
import { CalagemSchema } from './schemas/calagemSchema';
import { executarMotorCalagem } from './services/motorCalagem';
import cors from 'cors'; // O CORS importado

const app = express();
app.use(express.json());

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Ibiferti Backend - Motor Agronômico rodando!' });
});

app.post('/api/calcular', (req, res) => {
  try {
    // 1. O Guardião valida os dados
    const dadosValidados = CalagemSchema.parse(req.body);
    
    // 2. O Motor faz a matemática e orquestra as regras agronômicas
    const resultado = executarMotorCalagem(dadosValidados);
    
    // 3. Retornamos o Contrato de Saída em Sucesso
    res.status(200).json(resultado);

  } catch (error: any) {
    // Retornamos o Contrato de Saída em Erro
    res.status(400).json({
      sucesso: false,
      versao_regra: req.body?.versao_regra || 'desconhecida',
      codigo_erro: 'E001_FALHA_VALIDACAO_ENTRADA',
      mensagem: 'Os dados enviados não seguem o contrato agronômico.',
      detalhes: error.errors
    });
  }
});

app.listen(3000, () => {
  console.log('🚀 Backend rodando na porta 3000');
});