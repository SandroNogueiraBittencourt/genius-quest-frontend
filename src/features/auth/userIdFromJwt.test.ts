import { expect, it } from 'vitest';
import { userIdFromJwt } from './userIdFromJwt';

const usuarioId = '5af3c27d-6ed8-4850-8e4a-48642f38089c';

function jwt(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const segment = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return 'header.' + segment + '.assinatura';
}

it('lê o ID de um payload Base64URL sem preenchimento', () => {
  expect(userIdFromJwt(jwt({ usuarioId, nome: 'Testador 🧪' }))).toBe(
    usuarioId,
  );
});

it.each([null, {}, { usuarioId: 1 }, { usuarioId: 'id-invalido' }])(
  'ignora um payload sem UUID de usuário válido (%j)',
  (payload) => expect(userIdFromJwt(jwt(payload))).toBeNull(),
);

it('ignora Base64 ou JSON inválido sem interromper a tela', () => {
  expect(userIdFromJwt('header.@@@.assinatura')).toBeNull();
  expect(
    userIdFromJwt('header.' + btoa('texto simples') + '.assinatura'),
  ).toBeNull();
});
