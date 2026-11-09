import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { QuizPreparation } from './QuizPreparation';

const partida = {
  id: 'partida-01',
  cicloId: 'ciclo-01',
  cicloNome: 'Teste Ranking - Três Temas',
  temaId: 'tema-01',
  temaTitulo: 'Animais Selvagens',
  categoriaNome: 'Animais',
  status: 'PREPARACAO',
  criadoEm: '2026-11-09T14:00:00Z',
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <QuizPreparation
        onSignIn={() => undefined}
        onViewHistory={() => undefined}
      />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  useAuthStore.setState({ session: null, notice: null });
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('não solicita partidas de usuário deslogado', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  mount();
  expect(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it('mostra a partida preparada sem oferecer gameplay inexistente', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify([partida]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-partida', tipo: 'Bearer', expiraEm: 3600 },
      'jogador@geniusquest.test',
    );
  mount();
  expect(
    await screen.findByRole('heading', { name: 'Animais Selvagens' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Ainda não há perguntas disponíveis nesta partida.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Iniciar quiz' })).toBeNull();
});
