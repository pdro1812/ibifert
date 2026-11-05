import { app } from './app';

const servidor = app.listen(3000, () => {
  console.log('🚀 Backend rodando na porta 3000');
});

// No container o node é o PID 1, e o kernel não aplica a ação padrão de
// SIGTERM ao PID 1: sem este handler o `docker stop` espera 10 s e mata.
// Para de aceitar conexões, deixa as requisições em curso terminarem e sai.
function encerrar(sinal: string): void {
  console.log(`${sinal} recebido, encerrando...`);
  servidor.close(() => process.exit(0));
  servidor.closeIdleConnections();
  setTimeout(() => process.exit(0), 5000).unref();
}

process.once('SIGTERM', () => encerrar('SIGTERM'));
process.once('SIGINT', () => encerrar('SIGINT'));
