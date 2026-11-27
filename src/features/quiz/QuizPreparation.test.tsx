import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
        onRealRoom={() => undefined}
        onViewResults={() => undefined}
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
      new Response(
        JSON.stringify({ content: [partida], page: { totalPages: 1 } }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
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

it('mostra estados reais no histórico e oferece placar apenas para sala concluída', async () => {
  const id = '44444444-0000-4000-8000-000000000001';
  const codigoSala = '44444444-0000-4000-8000-000000000002';
  const real = {
    ...partida,
    id,
    cicloId: null,
    cicloNome: null,
    codigoSala,
    temaTitulo: 'Ciência',
    status: 'CONCLUIDA',
  };
  const running = {
    ...real,
    id: '44444444-0000-4000-8000-000000000003',
    temaTitulo: 'Geografia',
    status: 'EM_ANDAMENTO',
  };
  const cancelled = {
    ...real,
    id: '44444444-0000-4000-8000-000000000004',
    temaTitulo: 'História',
    status: 'CANCELADA',
  };
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-partida', tipo: 'Bearer', expiraEm: 3600 },
      'jogador@geniusquest.test',
    );
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith('/resultado')
              ? { partidaId: id, classificacao: [] }
              : {
                  content: [partida, real, running, cancelled],
                  page: { totalPages: 1 },
                },
          ),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    ),
  );
  mount();
  await screen.findByRole('heading', { name: real.temaTitulo });
  expect(screen.getByText('Em preparação')).toBeInTheDocument();
  expect(screen.getByText('Concluída')).toBeInTheDocument();
  expect(screen.getByText('Em andamento')).toBeInTheDocument();
  expect(screen.getByText('Cancelada')).toBeInTheDocument();
  const list = screen.getByRole('list');
  expect(
    within(list).getAllByRole('button', { name: 'Ver placar' }),
  ).toHaveLength(1);
  fireEvent.click(within(list).getByRole('button', { name: 'Ver placar' }));
  expect(
    await screen.findByText(
      'Esta partida terminou sem pontuações registradas.',
    ),
  ).toBeInTheDocument();
});

it('consulta a próxima página de partidas e permite voltar à primeira', async () => {
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-partida', tipo: 'Bearer', expiraEm: 3600 },
      'jogador@geniusquest.test',
    );
  const fetch = vi.fn(async (url: string) => {
    const page = new URL(url, window.location.origin).searchParams.get('page');
    const item =
      page === '0'
        ? partida
        : { ...partida, temaTitulo: 'Partida de outra página' };
    return new Response(
      JSON.stringify({ content: [item], page: { totalPages: 2 } }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });
  vi.stubGlobal('fetch', fetch);
  mount();

  await screen.findByText('Página 1 de 2');
  expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(
    await screen.findByRole('heading', { name: 'Partida de outra página' }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    '/api/partidas/minhas?incluirSalas=true&page=1&size=10',
    expect.any(Object),
  );
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect(
    await screen.findByRole('heading', { name: partida.temaTitulo }),
  ).toBeInTheDocument();
});
