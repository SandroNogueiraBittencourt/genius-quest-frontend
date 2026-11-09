import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { getMyMatches, prepareMatch } from './api';

const partida = {
  id: 'partida-01',
  cicloId: 'ciclo-01',
  cicloNome: 'Teste Ranking - Três Temas',
  temaId: 'tema-01',
  temaTitulo: 'Animais Selvagens',
  categoriaNome: 'Animais',
  status: 'PREPARACAO',
  criadoEm: '2026-11-09T14:00:00Z',
};
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  useAuthStore.getState().start(
    { token: 'token-partida', tipo: 'Bearer', expiraEm: 3600 },
    'jogador@geniusquest.test',
  );
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('prepara a partida enviando somente o identificador do ciclo e JWT', async () => {
  const fetch = vi.fn().mockResolvedValue(response(partida, 201));
  vi.stubGlobal('fetch', fetch);
  expect(await prepareMatch('ciclo-01')).toEqual(partida);
  expect(fetch.mock.calls[0][0]).toMatch(/\/partidas$/);
  expect(fetch.mock.calls[0][1].method).toBe('POST');
  expect(JSON.parse(String(fetch.mock.calls[0][1].body))).toEqual({
    cicloId: 'ciclo-01',
  });
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
    'Bearer token-partida',
  );
});

it('consulta somente as partidas retornadas para a sessão atual', async () => {
  const fetch = vi.fn().mockResolvedValue(response([partida]));
  vi.stubGlobal('fetch', fetch);
  expect(await getMyMatches()).toEqual([partida]);
  expect(fetch.mock.calls[0][0]).toMatch(/\/partidas\/minhas$/);
});

it('não mascara conflitos quando ciclo ainda não tem vencedor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 409)));
  await expect(prepareMatch('ciclo-aberto')).rejects.toMatchObject({
    status: 409,
  });
});

it('rejeita estrutura inválida de partida', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ id: '1' }])));
  await expect(getMyMatches()).rejects.toMatchObject({ status: 502 });
});
