import { expect, it } from 'vitest';
import { passwordError, passwordHint } from './passwordPolicy';

it.each(['senhaforte1!', 'SENHAFORTE1!', 'SenhaForte!', 'SenhaForte1 '])(
  'exige todos os grupos de caracteres na senha %s',
  (password) => expect(passwordError(password)).toBe(passwordHint),
);

it('aceita caracteres Unicode e símbolos além da pontuação ASCII', () => {
  expect(passwordError('Árvore9€')).toBeUndefined();
});

it('conta o emoji como um caractere na regra de comprimento mínimo', () => {
  expect(passwordError('Aa1!ab😀')).toBe(passwordHint);
  expect(passwordError('Aa1!abc😀')).toBeUndefined();
});
