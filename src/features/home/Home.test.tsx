import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../app/queryClient';
import { useAuthStore } from '../auth/store';
import { createRoom, joinRoom } from '../room/api';
import { useRoomStore } from '../room/store';
import { Home } from './Home';

vi.mock('../room/api', () => ({ createRoom: vi.fn(), joinRoom: vi.fn() }));

const codigo = '12345678-1234-1234-1234-123456789abc';
const sala = {
  codigo,
  partidaId: null,
  temaId: null,
  anfitriaoId: 'host',
  status: 'PREPARACAO' as const,
  participantes: [{ id: 'host', nome: 'Ana' }],
};

beforeEach(() => {
  useRoomStore.getState().leave();
  useAuthStore
    .getState()
    .start(
      { token: 'token', tipo: 'Bearer', expiraEm: 3600 },
      'ana@example.test',
    );
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.resetAllMocks();
});

function setup() {
  const onEnter = vi.fn();
  const onSignIn = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Home onEnter={onEnter} onSignIn={onSignIn} />
    </QueryClientProvider>,
  );
  return { onEnter, onSignIn };
}

it('cria sala diretamente sem partida ou tema', async () => {
  vi.mocked(createRoom).mockResolvedValue(sala);
  const { onEnter } = setup();
  fireEvent.click(screen.getByRole('button', { name: /Reunir a turma/ }));
  await waitFor(() => expect(onEnter).toHaveBeenCalledOnce());
  expect(createRoom).toHaveBeenCalledOnce();
  expect(useRoomStore.getState().session).toEqual({ code: codigo });
});

it('mostra erro de entrada e permite repetir com outro código', async () => {
  vi.mocked(joinRoom)
    .mockRejectedValueOnce(new Error('Sala não encontrada'))
    .mockResolvedValueOnce(sala);
  const { onEnter } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar em uma sala' }));
  const input = screen.getByRole('textbox', { name: 'Código da sala' });
  expect(input).toHaveFocus();
  fireEvent.change(input, {
    target: { value: '12345678-1234-1234-1234-123456789000' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar na sala' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Sala não encontrada',
  );
  fireEvent.change(input, { target: { value: codigo } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar na sala' }));
  await waitFor(() => expect(onEnter).toHaveBeenCalledOnce());
});
