import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { resetDemoRooms } from '../features/demo/roomGateway';
import { useRoomStore } from '../features/room/store';
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  resetDemoRooms();
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
afterEach(() => vi.unstubAllGlobals());
it('preserva a sala ao visitar a abertura e permite retomá-la', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Reunir a turma/ }));
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Como podemos chamar você?' }),
    { target: { value: 'Sandro' } },
  );
  await screen.findByRole('radio', { name: /Natureza e descobertas/ });
  fireEvent.click(
    screen.getByRole('button', { name: 'Criar sala demonstrativa' }),
  );
  const heading = await screen.findByRole('heading', {
    name: 'Um lugar para sua turma.',
  });
  expect(heading).toHaveFocus();
  expect(window.location.search).toBe('?view=lobby');
  await screen.findByText('1/20');
  fireEvent.click(screen.getByRole('link', { name: 'Início' }));
  expect(screen.getByRole('button', { name: /Reunir a turma/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar para a sala' }));
  expect(await screen.findByText('1/20')).toBeInTheDocument();
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
