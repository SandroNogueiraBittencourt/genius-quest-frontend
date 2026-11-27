import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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

it.each([
  { status: 'APROVADO', mensagem: 'Tema criado e aprovado!' },
  { status: 'PENDENTE', mensagem: 'Sua sugestão foi enviada para revisão.' },
])(
  'mostra o retorno $status e só lista temas aprovados',
  async ({ status, mensagem }) => {
    const categoria = {
      id: 'categoria-1',
      nome: 'Ciências',
      descricao: null,
      status: 'APROVADA',
      criadoEm: '2026-10-25T12:00:00Z',
      atualizadoEm: '2026-10-25T12:00:00Z',
    };
    const tema = {
      id: 'tema-1',
      categoriaId: categoria.id,
      autorId: 'autor-1',
      titulo: 'Astronomia',
      descricao: null,
      status,
      criadoEm: categoria.criadoEm,
      atualizadoEm: categoria.atualizadoEm,
    };
    let criado = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options: RequestInit) => {
        if (url.endsWith('/categorias/aprovadas')) return json([categoria]);
        if (!url.endsWith('/temas')) return json({}, 404);
        if (options.method === 'POST') {
          criado = true;
          return json(tema, 201);
        }
        return json(criado && status === 'APROVADO' ? [tema] : []);
      }),
    );
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <Themes onSignIn={() => undefined} />
      </QueryClientProvider>,
    );

    await screen.findByRole('option', { name: 'Ciências' });
    fireEvent.change(screen.getByLabelText('Categoria aprovada'), {
      target: { value: categoria.id },
    });
    fireEvent.change(screen.getByLabelText('Título do tema'), {
      target: { value: tema.titulo },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar sugestão' }));

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    if (status === 'APROVADO')
      expect(
        await screen.findByRole('heading', { name: tema.titulo }),
      ).toBeInTheDocument();
    else
      expect(screen.queryByRole('heading', { name: tema.titulo })).toBeNull();
  },
);
