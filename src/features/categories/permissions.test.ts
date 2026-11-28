import { expect, it } from 'vitest';
import { hasAdminClaim } from './permissions';

function jwt(perfil: string) {
  return 'header.' + btoa(JSON.stringify({ perfil })) + '.signature';
}

it('identifica a alegação de perfil somente para apresentação da interface', () => {
  expect(hasAdminClaim(jwt('ADMIN'))).toBe(true);
  expect(hasAdminClaim(jwt('USUARIO'))).toBe(false);
  expect(hasAdminClaim('token-invalido')).toBe(false);
});

it.each([
  null,
  [],
  {},
  { perfil: 'admin' },
  { perfil: ['ADMIN'] },
  { perfil: true },
])('não exibe a navegação administrativa para o conteúdo %j', (payload) => {
  const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
  expect(hasAdminClaim(token)).toBe(false);
});

it('não exibe navegação administrativa com um payload que não é JSON', () => {
  expect(hasAdminClaim('header.' + btoa('ADMIN') + '.signature')).toBe(false);
});
