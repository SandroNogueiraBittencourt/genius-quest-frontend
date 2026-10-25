import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from './store';
import { authenticatedRequest } from './authenticatedRequest';
beforeEach(() => useAuthStore.setState({ session: null, notice: null }));
afterEach(() => vi.unstubAllGlobals());
const response = {
  token: 'token-one',
  tipo: 'Bearer' as const,
  expiraEm: 3600,
};
it('converte a duração em segundos e mantém a sessão somente em memória', () => {
  const now = Date.now();
  useAuthStore.getState().start(response, ' SANDRO@example.test ');
  expect(useAuthStore.getState().session).toMatchObject({
    email: 'sandro@example.test',
    expiresAt: expect.any(Number),
  });
  expect(useAuthStore.getState().session!.expiresAt).toBeGreaterThanOrEqual(
    now + 3_600_000,
  );
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
  useAuthStore.getState().end('signed-out');
  expect(useAuthStore.getState().session).toBeNull();
});
it.each([401, 403])(
  'trata HTTP %s preservando a distinção entre sessão e permissão',
  async (status) => {
    useAuthStore.getState().start(response, 'sandro@example.test');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('{"erro":"Sem acesso"}', { status })),
    );
    await expect(authenticatedRequest('/usuarios')).rejects.toMatchObject({
      status,
    });
    expect(useAuthStore.getState().session === null).toBe(status === 401);
  },
);
it('bloqueia o envio de um token já expirado', async () => {
  useAuthStore.setState({
    session: {
      token: 'old',
      email: 'a@example.test',
      expiresAt: Date.now() - 1,
    },
  });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(authenticatedRequest('/usuarios')).rejects.toMatchObject({
    status: 401,
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(useAuthStore.getState().notice).toBe('expired');
});
it('uma resposta 401 antiga não encerra uma nova sessão', async () => {
  useAuthStore.getState().start(response, 'a@example.test');
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    ),
  );
  const request = authenticatedRequest('/usuarios');
  useAuthStore
    .getState()
    .start({ ...response, token: 'new-token' }, 'b@example.test');
  resolve(new Response('{}', { status: 401 }));
  await expect(request).rejects.toMatchObject({ status: 401 });
  expect(useAuthStore.getState().session?.token).toBe('new-token');
});
