import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { CategoriesAdmin } from './CategoriesAdmin';

const category = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Astronomia',
  descricao: 'Universo',
  status: 'PENDENTE',
  criadoEm: '2026-11-05T12:00:00Z',
  atualizadoEm: '2026-11-05T12:00:00Z',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onSignIn = vi.fn();
  const result = render(
    <QueryClientProvider client={client}>
      <CategoriesAdmin onSignIn={onSignIn} />
    </QueryClientProvider>,
  );
  return { ...result, client, onSignIn };
}

beforeEach(() => {
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-admin', tipo: 'Bearer', expiraEm: 3600 },
      'admin@example.test',
    );
});

afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('não consulta a API sem login', () => {
  useAuthStore.getState().end(null);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const { onSignIn, client } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar para moderar' }));
  expect(onSignIn).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
  client.clear();
});

it('exibe 403 para usuário não autorizado, sem mostrar ações de moderação', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ erro: 'Acesso negado' }, 403)),
  );
  const { client } = setup();
  expect(
    await screen.findByText('Acesso restrito a administradores.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
  expect(useAuthStore.getState().session).not.toBeNull();
  client.clear();
});

it('lista pendentes e permite aprovar via PATCH autenticado', async () => {
  let status = 'PENDENTE';
  const fetch = vi
    .fn()
    .mockImplementation((url: string) => {
      if (url.endsWith('/aprovar')) {
        status = 'APROVADA';
        return Promise.resolve(json({ ...category, status }));
      }
      return Promise.resolve(json([{ ...category, status }]));
    });
  vi.stubGlobal('fetch', fetch);
  const { client } = setup();
  expect(
    await screen.findByRole('heading', { name: 'Astronomia' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
  expect(
    await screen.findByText('Categoria "Astronomia" atualizada: Aprovada.'),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    '/api/categorias/' + category.id + '/aprovar',
    expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
    }),
  );
  client.clear();
});

it('exige confirmação explícita antes de remover', async () => {
  const fetch = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/remover')
          ? json({ ...category, status: 'REMOVIDA' })
          : json([category]),
      ),
    );
  vi.stubGlobal('fetch', fetch);
  const { client } = setup();
  await screen.findByRole('heading', { name: 'Astronomia' });
  fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
  expect(
    await screen.findByText('Categoria "Astronomia" atualizada: Removida.'),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    '/api/categorias/' + category.id + '/remover',
    expect.objectContaining({ method: 'PATCH' }),
  );
  client.clear();
});
