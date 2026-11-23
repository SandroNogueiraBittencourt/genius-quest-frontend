import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../app/queryClient';
import { useAuthStore } from '../auth/store';
import { MatchResultsPage } from './MatchResultsPage';

afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

function mount() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MatchResultsPage onSignIn={() => undefined} />
    </QueryClientProvider>,
  );
}

it('pede autenticação antes de consultar resultados', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  mount();

  expect(
    screen.getByRole('button', { name: 'Entrar para ver resultados' }),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it('mostra só partidas concluídas e consulta o placar ao abrir', async () => {
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-resultado', tipo: 'Bearer', expiraEm: 3600 },
      'jogador@geniusquest.test',
    );
  const partida = {
    id: 'partida-1',
    cicloId: null,
    cicloNome: null,
    temaId: 'tema-1',
    temaTitulo: 'Astronomia',
    categoriaNome: 'Ciências',
    status: 'CONCLUIDA',
    criadoEm: '2026-11-21T14:00:00Z',
    codigoSala: 'sala-1',
  };
  const response = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      response([
        partida,
        {
          ...partida,
          id: 'partida-2',
          temaTitulo: 'Geografia',
          status: 'EM_ANDAMENTO',
        },
      ]),
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
  mount();

  expect(
    await screen.findByRole('heading', { name: 'Astronomia' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Geografia' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Votações encerradas')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver placar' }));
  expect(
    await screen.findByRole('rowheader', { name: 'Ana' }),
  ).toBeInTheDocument();
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    expect.stringMatching(/\/partidas\/minhas\?incluirSalas=true$/),
    expect.stringMatching(/\/salas\/sala-1\/partidas\/partida-1\/resultado$/),
  ]);
});
