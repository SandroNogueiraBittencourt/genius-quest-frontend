import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './http';
afterEach(() => vi.unstubAllGlobals());
it('envia JSON e Bearer somente quando fornecidos', async () => {
  const fetch = vi.fn().mockImplementation(
    () =>
      new Response('{"ok":true}', {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  await apiRequest('/teste', {
    method: 'POST',
    json: { nome: 'Sandro' },
    token: 'token',
  });
  expect(fetch).toHaveBeenCalledWith(
    '/api/teste',
    expect.objectContaining({
      method: 'POST',
      body: '{"nome":"Sandro"}',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      cache: 'no-store',
      credentials: 'omit',
    }),
  );
  await apiRequest('/health');
  expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
});
it('preserva mensagem e erros por campo da API', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          mensagem: 'Dados inválidos',
          campos: { email: 'E-mail inválido' },
        }),
        { status: 400 },
      ),
    ),
  );
  await expect(apiRequest('/usuarios')).rejects.toMatchObject({
    status: 400,
    message: 'Dados inválidos',
    fields: { email: 'E-mail inválido' },
  });
});
it.each([401, 403])(
  'trata o formato mínimo de segurança HTTP %s',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"erro":"Acesso negado"}', { status }),
        ),
    );
    await expect(apiRequest('/privado')).rejects.toMatchObject({
      status,
      message: 'Acesso negado',
    });
  },
);
it('rejeita HTML de fallback e não exibe o corpo bruto de erro', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<html>SPA</html>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('<html>Erro interno</html>', { status: 500 }),
      ),
  );
  await expect(apiRequest('/auth/login')).rejects.toMatchObject({
    status: 502,
  });
  await expect(apiRequest('/auth/login')).rejects.toThrow('HTTP 500');
});
it('distingue indisponibilidade de rede e cancelamento', async () => {
  const controller = new AbortController();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  );
  await expect(apiRequest('/usuarios')).rejects.toBeInstanceOf(ApiError);
  const error = new DOMException('Cancelado', 'AbortError');
  controller.abort();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
  await expect(
    apiRequest('/usuarios', { signal: controller.signal }),
  ).rejects.toBe(error);
});
