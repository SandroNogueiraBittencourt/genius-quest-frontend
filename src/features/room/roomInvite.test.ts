import { afterEach, expect, it } from 'vitest';
import { buildRoomInvite, clearRoomInvite, readRoomInvite } from './roomInvite';

const code = '33333333-0000-4000-8000-000000000001';
afterEach(() => window.history.replaceState({}, '', '/'));

it('gera convite no mesmo domínio, sem JWT ou dados pessoais', () => {
  expect(buildRoomInvite(code, 'https://gq.example')).toBe(
    `https://gq.example/?view=real-room&room=${code}`,
  );
});
it('normaliza UUID e rejeita parâmetros inválidos ou repetidos', () => {
  expect(readRoomInvite(`?room=${code.toUpperCase()}`)).toBe(code);
  expect(readRoomInvite('?room=https://evil.example')).toBeNull();
  expect(readRoomInvite(`?room=${code}&room=${code}`)).toBeNull();
  expect(() => buildRoomInvite('invalido')).toThrow();
});
it('remove apenas o convite depois de entrar', () => {
  window.history.replaceState({}, '', `/?view=real-room&room=${code}`);
  clearRoomInvite();
  expect(window.location.search).toBe('?view=real-room');
});
