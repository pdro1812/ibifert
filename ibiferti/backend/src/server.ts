import express from 'express';
import { CalagemSchema } from './schemas/calagemSchema'; // Ajuste o caminho se necessário

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Ibiferti Backend - Motor Agronômico rodando!' });
});

// Nossa rota de cálculo que usa o Guardião de Dados
app.post('/api/calcular', (req, res) => {
  try {
    // Tenta validar o JSON recebido contra o nosso Schema estrito
    const dadosValidados = CalagemSchema.parse(req.body);
    
    // Se passou, por enquanto só devolvemos sucesso (Fase 3 faremos o motor de verdade)
    res.status(200).json({
      sucesso: true,
      mensagem: 'Validação passou! Dados prontos para o motor de cálculo.',
      dados_recebidos: dadosValidados
    });

  } catch (error: any) {
    // Se o Zod barrar, formatamos a saída de erro padronizada
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