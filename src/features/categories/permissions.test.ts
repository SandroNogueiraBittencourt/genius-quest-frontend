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
