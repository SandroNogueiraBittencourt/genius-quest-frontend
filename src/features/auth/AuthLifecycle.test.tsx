import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../app/queryClient';
import { useRoomStore } from '../room/store';
import { AuthLifecycle } from './AuthLifecycle';
import { useAuthStore } from './store';
beforeEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());
function setup() {
  const client = createQueryClient();
  render(
    <QueryClientProvider client={client}>
      <AuthLifecycle />
    </QueryClientProvider>,
  );
  return client;
}
it('encerra a sessão quando o prazo retornado pela API termina', () => {
  setup();
  act(() =>
    useAuthStore
      .getState()
      .start({ token: 'jwt', tipo: 'Bearer', expiraEm: 1 }, 'a@example.test'),
  );
  act(() => vi.advanceTimersByTime(1001));
  expect(useAuthStore.getState().session).toBeNull();
  expect(useAuthStore.getState().notice).toBe('expired');
});
it('reconfere expiração ao recuperar foco após suspensão da aba', () => {
  setup();
  act(() =>
    useAuthStore
      .getState()
      .start({ token: 'jwt', tipo: 'Bearer', expiraEm: 60 }, 'a@example.test'),
  );
  vi.setSystemTime(Date.now() + 61_000);
  fireEvent.focus(window);
  expect(useAuthStore.getState().session).toBeNull();
});
it('limpa cache e sala demonstrativa ao trocar ou encerrar sessão', () => {
  const client = setup();
  act(() =>
    useAuthStore
      .getState()
      .start(
        { token: 'jwt', tipo: 'Bearer', expiraEm: 3600 },
        'a@example.test',
      ),
  );
  client.setQueryData(['private', 'profile'], { email: 'a@example.test' });
  useRoomStore.getState().enter({ code: 'GQ2026', playerId: 'p' });
  act(() => useAuthStore.getState().end('signed-out'));
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  expect(useRoomStore.getState().session).toBeNull();
});
