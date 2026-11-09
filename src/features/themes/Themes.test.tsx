import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { Themes } from './Themes';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  useAuthStore
    .getState()
    .start(
      { token: 'token-de-teste', tipo: 'Bearer', expiraEm: 3600 },
      'teste@geniusquest.local',
    );
});

afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('explica a ausência de categorias e impede o envio de sugestões', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/ciclos-votacao/atual'))
        return Promise.resolve(json({}, 404));
      if (url.endsWith('/categorias/aprovadas'))
        return Promise.resolve(json([]));
      if (url.endsWith('/temas')) return Promise.resolve(json([]));
      return Promise.resolve(json({}, 404));
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Themes onSignIn={() => undefined} />
    </QueryClientProvider>,
  );

  expect(
    await screen.findByText(/Ainda não há categorias aprovadas/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('combobox', { name: 'Categoria aprovada' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Enviar sugestão' }),
  ).toBeDisabled();
});
