import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { getApprovedCategories, suggestCategory } from './api';

const category = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Natureza',
  descricao: null,
  status: 'APROVADA',
  criadoEm: '2026-10-25T12:00:00Z',
  atualizadoEm: '2026-10-25T12:00:00Z',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
beforeEach(() =>
  useAuthStore
    .getState()
    .start(
      { token: 'test-jwt', tipo: 'Bearer', expiraEm: 3600 },
      'lia@example.test',
    ),
);
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('lista apenas aprovadas pelo endpoint autenticado e encaminha cancelamento', async () => {
  const fetch = vi.fn().mockResolvedValue(json([category]));
  vi.stubGlobal('fetch', fetch);
  const signal = new AbortController().signal;
  expect(await getApprovedCategories(signal)).toEqual([category]);
  expect(fetch).toHaveBeenCalledWith(
    '/api/categorias/aprovadas',
    expect.objectContaining({
      method: 'GET',
      signal,
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }),
  );
});

it.each([
  {},
  [{ ...category, status: 'PENDENTE' }],
  [{ ...category, status: 'REMOVIDA' }],
  [{ ...category, nome: '' }],
  [{ ...category, status: 'DESCONHECIDO' }],
])('rejeita lista fora do contrato: %j', async (data) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(data)));
  await expect(getApprovedCategories()).rejects.toMatchObject({ status: 502 });
});

it('envia sugestão com nome preservado, espaços aparados e descrição vazia como null', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(json({ ...category, status: 'PENDENTE' }, 201));
  vi.stubGlobal('fetch', fetch);
  expect(
    await suggestCategory({ nome: ' Natureza ', descricao: '   ' }),
  ).toMatchObject({ status: 'PENDENTE' });
  expect(fetch).toHaveBeenCalledWith(
    '/api/categorias',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ nome: 'Natureza', descricao: null }),
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }),
  );
});

it('preserva os erros por campo e conflitos retornados pelo backend', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      json(
        {
          mensagem: 'Categoria já cadastrada',
          campos: { nome: 'Escolha outro nome' },
        },
        409,
      ),
    ),
  );
  await expect(
    suggestCategory({ nome: 'Natureza', descricao: 'Uma ideia' }),
  ).rejects.toMatchObject({
    status: 409,
    fields: { nome: 'Escolha outro nome' },
  });
});

it('não envia solicitação sem sessão', async () => {
  useAuthStore.getState().end(null);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(getApprovedCategories()).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});

it('descarta uma sugestão que termina após troca de conta', async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    ),
  );
  const request = suggestCategory({ nome: 'Natureza', descricao: '' });
  useAuthStore
    .getState()
    .start(
      { token: 'other-jwt', tipo: 'Bearer', expiraEm: 3600 },
      'outro@example.test',
    );
  finish(json({ ...category, status: 'PENDENTE' }, 201));
  await expect(request).rejects.toMatchObject({ name: 'AbortError' });
});
