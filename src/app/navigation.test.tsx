import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { useAuthStore } from '../features/auth/store';
import { useRoomStore } from '../features/room/store';
beforeEach(() => {
  window.history.replaceState({}, '', '/');

  useRoomStore.getState().leave();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'UP',
          application: 'Genius Quest Backend',
          timestamp: '2026-10-08',
        }),
      ),
    ),
  );
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});
it('preserva a sala ao visitar a abertura e permite retomá-la', async () => {
  useAuthStore
    .getState()
    .start(
      { token: 'token', tipo: 'Bearer', expiraEm: 3600 },
      'ana@example.test',
    );
  useRoomStore.getState().enter({ code: 'sala' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            codigo: 'sala',
            partidaId: 'partida',
            anfitriaoId: 'ana',
            status: 'PREPARACAO',
            participantes: [{ id: 'ana', nome: 'Ana' }],
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar para a sala' }));
  const heading = await screen.findByRole('heading', {
    name: 'Um lugar para sua turma.',
  });
  expect(heading).toHaveFocus();
  expect(window.location.search).toBe('?view=lobby');
  await screen.findByText('1 participante');
  fireEvent.click(screen.getByRole('link', { name: 'Início' }));
  expect(screen.getByRole('button', { name: /Reunir a turma/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar para a sala' }));
  expect(await screen.findByText('1 participante')).toBeInTheDocument();
});
it('mantém o catálogo acessível e permite retornar à abertura', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Design System' }));
  expect(window.location.search).toBe('?view=design-system');
  expect(
    screen.getByRole('heading', { name: 'Peças para cada descoberta' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: '← Voltar à abertura' }));
  expect(window.location.search).toBe('');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Cada pergunta,',
  );
});
