import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthLifecycle } from '../auth/AuthLifecycle';
import { useAuthStore } from '../auth/store';
import { MatchResultsPage } from './MatchResultsPage';
import type { PreparedMatch } from './api';

const codigo = '22222222-0000-4000-8000-000000000001';
const partidaId = '22222222-0000-4000-8000-000000000002';
const completed: PreparedMatch = {
  id: partidaId,
  codigoSala: codigo,
  cicloId: null,
  cicloNome: null,
  temaId: 'tema-01',
  temaTitulo: 'Natureza e descobertas',
  categoriaNome: 'Ciência',
  status: 'CONCLUIDA',
  criadoEm: '2026-11-10T12:00:00Z',
};
const individual: PreparedMatch = {
  ...completed,
  id: 'individual-01',
  codigoSala: null,
  cicloId: 'ciclo-01',
  cicloNome: 'Ciclo de novembro',
  temaTitulo: 'Tema individual',
};
const ongoing: PreparedMatch = {
  ...completed,
  id: '22222222-0000-4000-8000-000000000003',
  temaTitulo: 'Partida em andamento',
  status: 'EM_ANDAMENTO',
};
const resultPath = '/salas/' + codigo + '/partidas/' + partidaId + '/resultado';
const result = {
  partidaId,
  classificacao: [
    {
      id: '22222222-0000-4000-8000-000000000004',
      nome: 'Jogadora A',
      posicao: 1,
      pontos: 90,
      acertos: 7,
      erros: 3,
    },
    {
      id: '22222222-0000-4000-8000-000000000005',
      nome: 'Jogador B',
      posicao: 2,
      pontos: 30,
      acertos: 2,
      erros: 8,
    },
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function signIn(token = 'jwt-resultados', email = 'jogador@gq.test') {
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, email);
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthLifecycle />
      <MatchResultsPage
        onSignIn={() => undefined}
        onViewMatches={() => undefined}
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

it('exige login antes de consultar histórico e placares', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  mount();
  expect(
    screen.getByRole('button', { name: 'Entrar para ver resultados' }),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it('lista só partidas reais concluídas e consulta o placar histórico sob demanda', async () => {
  signIn();
  const fetch = vi.fn(async (url: string) =>
    url.endsWith('/partidas/minhas?incluirSalas=true')
      ? json([completed, ongoing, individual])
      : url.endsWith(resultPath)
        ? json(result)
        : json({}, 404),
  );
  vi.stubGlobal('fetch', fetch);
  mount();
  expect(
    await screen.findByRole('heading', { name: completed.temaTitulo }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: ongoing.temaTitulo }),
  ).toBeNull();
  expect(
    screen.queryByRole('heading', { name: individual.temaTitulo }),
  ).toBeNull();
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/resultado'))).toBe(
    false,
  );
  const toggle = screen.getByRole('button', { name: 'Ver placar' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  const table = await screen.findByRole('table', {
    name: 'Classificação final',
  });
  expect(
    within(table).getByRole('row', { name: '1º Jogadora A 90 7 3' }),
  ).toBeInTheDocument();
  expect(
    within(table).getByRole('row', { name: '2º Jogador B 30 2 8' }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining(resultPath),
    expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        Authorization: 'Bearer jwt-resultados',
      }),
    }),
  );
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(toggle);
  expect(screen.queryByRole('table')).toBeNull();
});

it('informa quando não existem partidas concluídas', async () => {
  signIn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json([ongoing, individual])),
  );
  mount();
  expect(
    await screen.findByText(
      'Você ainda não tem resultados de partidas multiplayer.',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ver placar' })).toBeNull();
});

it('permite repetir uma consulta de placar indisponível, sem inventar pontuação', async () => {
  signIn();
  let resultRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/partidas/minhas?incluirSalas=true'))
        return json([completed]);
      if (url.endsWith(resultPath)) {
        resultRequests++;
        return resultRequests === 1 ? json({}, 404) : json(result);
      }
      return json({}, 404);
    }),
  );
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Ver placar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'O placar desta partida não está disponível.',
  );
  expect(screen.queryByRole('table')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar carregar placar novamente' }),
  );
  expect(
    await screen.findByRole('table', { name: 'Classificação final' }),
  ).toBeInTheDocument();
});

it('limpa histórico e placar na troca de conta', async () => {
  signIn();
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (
      (init.headers as Record<string, string>).Authorization ===
      'Bearer outro-jwt'
    )
      return json([]);
    return url.endsWith(resultPath) ? json(result) : json([completed]);
  });
  vi.stubGlobal('fetch', fetch);
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Ver placar' }));
  await screen.findByRole('table');
  act(() => signIn('outro-jwt', 'outra@gq.test'));
  expect(screen.queryByRole('table')).toBeNull();
  expect(
    screen.queryByRole('heading', { name: completed.temaTitulo }),
  ).toBeNull();
  expect(
    await screen.findByText(
      'Você ainda não tem resultados de partidas multiplayer.',
    ),
  ).toBeInTheDocument();
});
