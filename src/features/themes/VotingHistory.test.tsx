import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { VotingHistory } from './VotingHistory';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const cycle = {
  id: 'ciclo-01',
  nome: 'Votação de Novembro',
  inicioEm: '2026-11-08T16:00:00Z',
  fimEm: '2026-11-08T18:00:00Z',
  encerradoEm: '2026-11-08T17:09:00Z',
  vencedorTemaId: 'tema-01',
  vencedorTitulo: 'História do Futebol',
  totalVotos: 2,
  rankingReconstruido: true,
};

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <VotingHistory onSignIn={() => undefined} />
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

it('pede login sem fazer requisição quando a sessão está ausente', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  mount();
  expect(
    screen.getByRole('button', { name: 'Entrar para ver resultados' }),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it('mostra vencedor, classificação e aviso para ciclos reconstruídos', async () => {
  useAuthStore.getState().start(
    { token: 'jwt-history', tipo: 'Bearer', expiraEm: 3600 },
    'jogador@example.test',
  );
  const fetch = vi.fn((url: string) => {
    if (url.includes('/historico?'))
      return Promise.resolve(
        json({ ciclos: [cycle], pagina: 0, tamanho: 10, total: 1, temProxima: false }),
      );
    if (url.endsWith('/ciclo-01/ranking'))
      return Promise.resolve(
        json([{ posicao: 1, temaId: 'tema-01', titulo: 'História do Futebol', votos: 2, votantesDistintos: 2 }]),
      );
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal('fetch', fetch);
  mount();

  expect(
    await screen.findByRole('heading', { name: 'Votação de Novembro' }),
  ).toBeInTheDocument();
  expect(await screen.findByText('Resultado histórico reconstruído a partir dos votos salvos.', { exact: false })).toBeInTheDocument();
  expect(await screen.findByText('2 votos')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
});

it('avança páginas sem misturar o resultado da página anterior', async () => {
  useAuthStore.getState().start(
    { token: 'jwt-history', tipo: 'Bearer', expiraEm: 3600 },
    'jogador@example.test',
  );
  const next = { ...cycle, id: 'ciclo-02', nome: 'Votação de Outubro', vencedorTitulo: null, vencedorTemaId: null, totalVotos: 0, rankingReconstruido: false };
  const fetch = vi.fn((url: string) => {
    if (url.includes('page=0'))
      return Promise.resolve(json({ ciclos: [cycle], pagina: 0, tamanho: 10, total: 2, temProxima: true }));
    if (url.includes('page=1'))
      return Promise.resolve(json({ ciclos: [next], pagina: 1, tamanho: 10, total: 2, temProxima: false }));
    return Promise.resolve(json([]));
  });
  vi.stubGlobal('fetch', fetch);
  mount();

  await screen.findByRole('heading', { name: 'Votação de Novembro' });
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(
    await screen.findByRole('heading', { name: 'Votação de Outubro' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Votação de Novembro' })).not.toBeInTheDocument();
});
