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
  useAuthStore
    .getState()
    .start(
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
  expect(fetch.mock.calls[0][0]).toMatch(
    /\/partidas\/minhas\?incluirSalas=true$/,
  );
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
    'Bearer token-partida',
  );
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

const realMatch = {
  ...partida,
  id: '11111111-0000-4000-8000-000000000001',
  cicloId: null,
  cicloNome: null,
  status: 'CONCLUIDA',
  codigoSala: '11111111-0000-4000-8000-000000000002',
};

it('aceita partida real sem ciclo e mantém compatibilidade com a preparação individual', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(response([realMatch, partida])),
  );
  await expect(getMyMatches()).resolves.toEqual([realMatch, partida]);
});

it.each([
  { ...realMatch, cicloNome: 'Ciclo inconsistente' },
  { ...realMatch, codigoSala: 'GQ2026' },
  { ...realMatch, codigoSala: null },
  { ...realMatch, id: 'partida-invalida' },
  { ...realMatch, status: 'DESCONHECIDO' },
  { ...realMatch, criadoEm: 'data inválida' },
])('recusa metadados inconsistentes da partida real %#', async (invalid) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([invalid])));
  await expect(getMyMatches()).rejects.toMatchObject({ status: 502 });
});

it('não confirma como preparação individual uma resposta de sala real', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(realMatch, 201)));
  await expect(prepareMatch('ciclo-01')).rejects.toMatchObject({ status: 502 });
});

it('descarta histórico que chega depois da troca de conta', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      useAuthStore
        .getState()
        .start(
          { token: 'nova-sessao', tipo: 'Bearer', expiraEm: 3600 },
          'outra@geniusquest.test',
        );
      return response([realMatch]);
    }),
  );
  await expect(getMyMatches()).rejects.toMatchObject({ name: 'AbortError' });
});
