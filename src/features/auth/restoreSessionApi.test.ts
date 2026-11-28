import { afterEach, expect, it, vi } from 'vitest';
import { restoreSession } from './api';

const resposta = {
  token: 'jwt-restaurado',
  tipo: 'Bearer',
  expiraEm: 180,
  email: 'conta@example.test',
};

function responder(body: unknown) {
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

it('restaura a sessão por cookie e propaga o cancelamento da requisição', async () => {
  const fetch = responder(resposta);
  const { signal } = new AbortController();
  await expect(restoreSession(signal)).resolves.toMatchObject({
    session: { token: resposta.token, expiraEm: 180 },
    email: resposta.email,
  });
  expect(fetch).toHaveBeenCalledWith(
    '/api/auth/sessao',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: '{}',
      signal,
    }),
  );
});

it.each([
  { email: undefined },
  { email: '   ' },
  { token: '' },
  { tipo: 'Basic' },
  { expiraEm: 0 },
  { expiraEm: 0.5 },
])('rejeita uma resposta inválida de restauração (%j)', async (alteracao) => {
  responder({ ...resposta, ...alteracao });
  await expect(
    restoreSession(new AbortController().signal),
  ).rejects.toMatchObject({ status: 502 });
});
