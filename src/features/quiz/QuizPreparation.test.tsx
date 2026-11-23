import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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
  expect(screen.getByText('Em preparação')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Iniciar quiz' })).toBeNull();
});

it('mostra a partida concluída e abre seu placar', async () => {
  const response = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      response([{ ...partida, status: 'CONCLUIDA', codigoSala: 'sala-01' }]),
    )
    .mockResolvedValueOnce(
      response({
        partidaId: partida.id,
        classificacao: [
          {
            id: 'ana',
            nome: 'Ana',
            posicao: 1,
            pontos: 100,
            acertos: 10,
            erros: 0,
          },
        ],
      }),
    );
  vi.stubGlobal('fetch', fetch);
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-partida', tipo: 'Bearer', expiraEm: 3600 },
      'jogador@geniusquest.test',
    );
  mount();
  expect(await screen.findByText('Concluída')).toBeInTheDocument();
  expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver placar' }));
  expect(
    await screen.findByRole('rowheader', { name: 'Ana' }),
  ).toBeInTheDocument();
  expect(fetch.mock.calls[1][0]).toMatch(
    /\/salas\/sala-01\/partidas\/partida-01\/resultado$/,
  );
});
