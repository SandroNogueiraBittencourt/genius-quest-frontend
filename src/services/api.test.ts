import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHealth } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('consulta de saúde da API', () => {
  it('consulta a rota existente e entrega o retorno do servidor', async () => {
    const body = {
      status: 'UP',
      application: 'Genius Quest Backend',
      timestamp: '2026-10-07T15:00:00Z',
    };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetch);
    expect(await getHealth()).toEqual(body);
    expect(fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });
  it('propaga uma resposta HTTP de falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 503 })),
    );
    await expect(getHealth()).rejects.toThrow('HTTP 503');
  });
  it('propaga falha de rede para a interface tratar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Sem conexão')),
    );
    await expect(getHealth()).rejects.toThrow('Sem conexão');
  });
});
