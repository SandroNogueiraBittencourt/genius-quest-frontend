import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { resetDemoRooms } from '../features/demo/roomGateway';
import { useRoomStore } from '../features/room/store';
import { useAuthStore } from '../features/auth/store';
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  resetDemoRooms();
  useRoomStore.getState().leave();
  useAuthStore.setState({ session: null, notice: null });
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

it('separa o histórico de votação do histórico de placares das partidas', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Resultados' }));
  expect(window.location.search).toBe('?view=match-results');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Resultados' }),
  ).toHaveFocus();
  expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  fireEvent.click(screen.getByRole('link', { name: 'Histórico de votação' }));
  expect(window.location.search).toBe('?view=history');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Histórico de votação.' }),
  ).toBeInTheDocument();
});

it('reconhece o acesso direto à página de resultados e oferece login', () => {
  window.history.replaceState({}, '', '/?view=match-results');
  render(<App />);
  expect(
    screen.getByRole('heading', { level: 1, name: 'Resultados' }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar para ver resultados' }),
  );
  expect(window.location.search).toBe('?view=login');
});

it('retorna à página de resultados depois de autenticar', async () => {
  window.history.replaceState({}, '', '/?view=match-results');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith('/auth/login')
              ? { token: 'sessao-de-teste', tipo: 'Bearer', expiraEm: 3600 }
              : url.endsWith('/partidas/minhas?incluirSalas=true')
                ? []
                : {
                    status: 'UP',
                    application: 'Genius Quest Backend',
                    timestamp: '2026-11-24',
                  },
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );
  render(<App />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar para ver resultados' }),
  );
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'jogador@gq.test' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'senha-de-teste' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  expect(
    await screen.findByText(
      'Você ainda não tem resultados de partidas multiplayer.',
    ),
  ).toBeInTheDocument();
  expect(window.location.search).toBe('?view=match-results');
});
