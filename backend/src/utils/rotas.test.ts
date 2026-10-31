import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { subirAmbienteDeTeste, clienteDeTeste, type AmbienteDeTeste } from './bancoDeTeste';

// Testes de rota contra o app real e um Postgres descartável (ver bancoDeTeste.ts).

let ambiente: AmbienteDeTeste;
let requisitar: ReturnType<typeof clienteDeTeste>;

before(async () => {
  ambiente = await subirAmbienteDeTeste();
  requisitar = clienteDeTeste(ambiente.url);
});

after(async () => {
  await ambiente.fechar();
});

test('Ambiente de teste: migrações aplicadas e app respondendo', async () => {
  const r = await requisitar('GET', '/analises/regional-stats');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.medias.total, 0);
});
