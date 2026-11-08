import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import {
  getCurrentCycle,
  getManagedThemes,
  getThemes,
  suggestTheme,
  voteTheme,
} from './api';

const tema = {
  id: 'tema-01',
  categoriaId: 'categoria-01',
  autorId: 'usuario-01',
  titulo: 'História do xadrez',
  descricao: 'Explorar o jogo',
  status: 'APROVADO',
  criadoEm: '2026-11-07T20:00:00Z',
  atualizadoEm: '2026-11-07T20:00:00Z',
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
      { token: 'token-de-teste', tipo: 'Bearer', expiraEm: 3600 },
      'usuario@teste.local',
    );
});

afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('consulta temas aprovados usando o JWT da sessão', async () => {
  const fetch = vi.fn().mockResolvedValue(response([tema]));
  vi.stubGlobal('fetch', fetch);
  expect(await getThemes()).toEqual([tema]);
  expect(fetch.mock.calls[0][0]).toMatch(/\/temas$/);
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
    'Bearer token-de-teste',
  );
});

it('envia sugestão sem permitir autoria no payload', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(response({ ...tema, status: 'PENDENTE' }, 201));
  vi.stubGlobal('fetch', fetch);
  await suggestTheme({
    categoriaId: 'categoria-01',
    titulo: ' História do xadrez ',
    descricao: '',
  });
  const payload = JSON.parse(String(fetch.mock.calls[0][1].body));
  expect(payload).toEqual({
    categoriaId: 'categoria-01',
    titulo: 'História do xadrez',
    descricao: null,
  });
  expect(payload).not.toHaveProperty('autorId');
});

it('interpreta 404 de ciclo como ausência de ciclo aberto', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 404)));
  expect(await getCurrentCycle()).toBeNull();
});

it('propaga 403 de moderação sem apagar a sessão', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 403)));
  await expect(getManagedThemes()).rejects.toMatchObject({ status: 403 });
  expect(useAuthStore.getState().session).not.toBeNull();
});

it('não oculta erro 409 quando o jogador já votou', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 409)));
  await expect(voteTheme('tema-01')).rejects.toMatchObject({ status: 409 });
});
