import { expect, it } from 'vitest';
import { useRoomStore } from './store';
it('registra a sessão ao entrar e a limpa ao sair', () => {
  const session = { code: 'GQ2026', playerId: 'player' };
  useRoomStore.getState().enter(session);
  expect(useRoomStore.getState().session).toEqual(session);
  useRoomStore.getState().leave();
  expect(useRoomStore.getState().session).toBeNull();
});
