import { afterEach, expect, it, vi } from 'vitest';
import { login, register } from './api';
afterEach(() => vi.unstubAllGlobals());
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
it('usa os campos reais do login, normaliza o e-mail e preserva a senha', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      json({ token: 'opaque-jwt', tipo: 'Bearer', expiraEm: 3600 }),
    );
  vi.stubGlobal('fetch', fetch);
  expect(
    await login({ email: ' SANDRO@EXAMPLE.TEST ', senha: ' senha exata ' }),
  ).toMatchObject({ expiraEm: 3600 });
  expect(fetch).toHaveBeenCalledWith(
    '/api/auth/login',
    expect.objectContaining({
      body: JSON.stringify({
        email: 'sandro@example.test',
        senha: ' senha exata ',
      }),
    }),
  );
});
it.each([
  { token: '', tipo: 'Bearer', expiraEm: 3600 },
  { token: 'jwt', tipo: 'Basic', expiraEm: 3600 },
  { token: 'jwt', tipo: 'Bearer', expiraEm: 0 },
  { token: 'jwt', tipo: 'Bearer', expiraEm: '3600' },
])('rejeita contrato de sessão inválido: %j', async (data) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(data)));
  await expect(
    login({ email: 'a@example.test', senha: 'senha' }),
  ).rejects.toMatchObject({ status: 502 });
});
it('cadastra usando nome, email e senha sem abrir sessão automaticamente', async () => {
  const user = {
    id: 'id',
    nome: 'Sandro',
    email: 'sandro@example.test',
    perfil: 'USUARIO',
    moedas: 0,
    ativo: true,
    criadoEm: '2026-10-25',
    atualizadoEm: '2026-10-25',
  };
  const fetch = vi.fn().mockResolvedValue(json(user, 201));
  vi.stubGlobal('fetch', fetch);
  expect(
    await register({
      nome: ' Sandro ',
      email: ' SANDRO@example.test ',
      senha: 'senha123',
    }),
  ).toEqual(user);
  expect(fetch).toHaveBeenCalledWith(
    '/api/usuarios',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        nome: 'Sandro',
        email: 'sandro@example.test',
        senha: 'senha123',
      }),
    }),
  );
});
