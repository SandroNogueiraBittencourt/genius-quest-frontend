import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  forgetSessionUser,
  readSessionUser,
  rememberSessionUser,
} from './sessionResume';

const id = '550E8400-E29B-41D4-A716-446655440000';
const token =
  'header.' + btoa(JSON.stringify({ usuarioId: id })) + '.assinatura';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

it('guarda somente o UUID normalizado da conta na aba', () => {
  rememberSessionUser(token);
  expect(readSessionUser()).toBe(id.toLowerCase());
  expect(sessionStorage.length).toBe(1);
  expect(sessionStorage.getItem(sessionStorage.key(0)!)).toBe(id.toLowerCase());
});

it('remove o identificador anterior quando o novo JWT não identifica uma conta', () => {
  rememberSessionUser(token);
  rememberSessionUser('token-sem-payload');
  expect(readSessionUser()).toBeNull();
});

it('esquece o identificador da conta ao sair', () => {
  rememberSessionUser(token);
  forgetSessionUser();
  expect(readSessionUser()).toBeNull();
});

it('tolera restrições do navegador ao ler, gravar e remover o identificador', () => {
  const negar = () => {
    throw new DOMException('Armazenamento indisponível', 'SecurityError');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(negar);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(negar);
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(negar);
  expect(readSessionUser()).toBeNull();
  expect(() => rememberSessionUser(token)).not.toThrow();
  expect(() => forgetSessionUser()).not.toThrow();
});
