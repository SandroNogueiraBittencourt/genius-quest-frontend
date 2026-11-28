import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { Themes } from './Themes';
import { ThemesAdmin } from './ThemesAdmin';

const aprovados = Array.from({ length: 11 }, (_, index) => ({
  id: 'tema-' + index,
  categoriaId: 'categoria-1',
  autorId: 'autor-1',
  titulo: 'Tema ' + (index + 1),
  descricao: null,
  status: 'APROVADO',
  criadoEm: '2026-10-25T12:00:00Z',
  atualizadoEm: '2026-10-25T12:00:00Z',
}));
const pendentes = aprovados.map((tema, index) => ({
  ...tema,
  id: 'pendente-' + index,
  titulo: 'Pendente ' + (index + 1),
  status: 'PENDENTE',
}));

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setup(Tela: typeof Themes | typeof ThemesAdmin) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Tela onSignIn={() => undefined} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-teste', tipo: 'Bearer', expiraEm: 3600 },
      'admin@example.test',
    );
});

afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('pagina temas aprovados e volta à primeira página sem refazer a consulta', async () => {
  const temas = vi.fn(() => json(aprovados));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/temas')) return temas();
      if (url.endsWith('/categorias/aprovadas')) return json([]);
      return json({}, 404);
    }),
  );
  setup(Themes);
  expect(
    await screen.findByRole('heading', { name: 'Tema 1' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tema 11' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tema 11' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tema 1' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect(screen.getByRole('heading', { name: 'Tema 1' })).toBeInTheDocument();
  expect(temas).toHaveBeenCalledOnce();
});

it('aplica o filtro antes de paginar e volta à primeira página ao trocar de status', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('/temas/moderacao')
        ? json([...aprovados, ...pendentes])
        : json({}, 404),
    ),
  );
  setup(ThemesAdmin);
  expect(
    await screen.findByRole('heading', { name: 'Pendente 1' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(
    screen.getByRole('heading', { name: 'Pendente 11' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Aprovado' }));
  expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tema 1' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tema 11' })).toBeNull();
});

it('volta à última página disponível quando a atualização reduz a lista pública', async () => {
  let lista = aprovados;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/temas')) return json(lista);
      if (url.endsWith('/categorias/aprovadas')) return json([]);
      return json({}, 404);
    }),
  );
  setup(Themes);
  await screen.findByRole('heading', { name: 'Tema 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  expect(screen.getByRole('heading', { name: 'Tema 11' })).toBeInTheDocument();
  lista = aprovados.slice(0, 10);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  expect(
    await screen.findByRole('heading', { name: 'Tema 1' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('navigation', { name: 'Paginação de temas aprovados' }),
  ).toBeNull();
});

it('recalcula a página após aprovar o último tema pendente da segunda página', async () => {
  const ultimo = pendentes[10];
  let lista = pendentes;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit) => {
      if (options.method === 'PATCH' && url.endsWith('/aprovar')) {
        const atualizado = { ...ultimo, status: 'APROVADO' };
        lista = [...pendentes.slice(0, 10), atualizado];
        return json(atualizado);
      }
      if (url.endsWith('/temas/moderacao')) return json(lista);
      return json({}, 404);
    }),
  );
  setup(ThemesAdmin);
  await screen.findByRole('heading', { name: 'Pendente 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
  expect(
    await screen.findByRole('heading', { name: 'Pendente 1' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('navigation', {
      name: 'Paginação de temas em moderação',
    }),
  ).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Aprovado' }));
  expect(
    screen.getByRole('heading', { name: ultimo.titulo }),
  ).toBeInTheDocument();
});

it('mostra lista vazia ao trocar para um filtro sem temas', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('/temas/moderacao') ? json(pendentes) : json({}, 404),
    ),
  );
  setup(ThemesAdmin);
  await screen.findByRole('heading', { name: 'Pendente 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  fireEvent.click(screen.getByRole('button', { name: 'Suspenso' }));
  expect(
    screen.getByText('Nenhum tema corresponde a este filtro.'),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('navigation', {
      name: 'Paginação de temas em moderação',
    }),
  ).toBeNull();
});
