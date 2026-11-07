import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthLifecycle } from '../auth/AuthLifecycle';
import { useAuthStore } from '../auth/store';
import { Categories } from './Categories';

const category = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Astronomia',
  descricao: 'Uma conversa sobre o universo.',
  status: 'APROVADA',
  criadoEm: '2026-10-25T12:00:00Z',
  atualizadoEm: '2026-10-25T12:00:00Z',
};
const clients: QueryClient[] = [];
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
beforeEach(() =>
  useAuthStore
    .getState()
    .start(
      { token: 'jwt', tipo: 'Bearer', expiraEm: 3600 },
      'lia@example.test',
    ),
);
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  const onSignIn = vi.fn();
  const page = render(
    <QueryClientProvider client={client}>
      <AuthLifecycle />
      <Categories onSignIn={onSignIn} />
    </QueryClientProvider>,
  );
  return { ...page, onSignIn, client };
}
function fillForm() {
  fireEvent.change(screen.getByLabelText('Nome da categoria'), {
    target: { value: ' Oceanos ' },
  });
  fireEvent.change(screen.getByLabelText(/Descrição/), {
    target: { value: ' A vida nos mares. ' },
  });
}
function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Enviar para revisão' }));
}

it('oferece entrada sem consultar endpoints protegidos para visitantes', () => {
  useAuthStore.getState().end(null);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const page = setup();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar para ver categorias' }),
  );
  expect(page.onSignIn).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Nome da categoria')).not.toBeInTheDocument();
});

it('anuncia carregamento e depois mostra as categorias aprovadas', async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    ),
  );
  setup();
  expect(screen.getByRole('status')).toHaveTextContent('Buscando categorias');
  await act(async () =>
    finish(
      json([
        category,
        { ...category, id: 'outro-id', nome: 'História', descricao: null },
      ]),
    ),
  );
  expect(
    await screen.findByRole('heading', { name: 'Astronomia' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Uma conversa sobre o universo.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Uma oportunidade de descobrir algo novo juntos.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    '2 categorias aprovadas',
  );
});

it('explica lista vazia e mantém a possibilidade de sugerir', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => Promise.resolve(json([]))),
  );
  setup();
  expect(
    await screen.findByText('A primeira descoberta pode começar com você.'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Enviar para revisão' }),
  ).toBeEnabled();
});

it('recupera uma consulta após erro de rede, sem repetição automática', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockImplementation(() => Promise.resolve(json([category])));
  vi.stubGlobal('fetch', fetch);
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Não foi possível conectar à API',
  );
  expect(fetch).toHaveBeenCalledOnce();
  fireEvent.click(
    screen.getByRole('button', { name: 'Tentar carregar novamente' }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Astronomia' }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('trata 403 sem encerrar a sessão ou repetir a consulta', async () => {
  const fetch = vi.fn().mockResolvedValue(json({ erro: 'Acesso negado' }, 403));
  vi.stubGlobal('fetch', fetch);
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Sua conta não tem permissão para consultar',
  );
  expect(useAuthStore.getState().session).not.toBeNull();
  expect(fetch).toHaveBeenCalledOnce();
  expect(
    screen.queryByRole('button', { name: 'Tentar carregar novamente' }),
  ).not.toBeInTheDocument();
});

it('401 encerra a sessão e remove o formulário protegido', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ erro: 'Não autenticado' }, 401)),
  );
  setup();
  await screen.findByRole('button', { name: 'Entrar para ver categorias' });
  expect(useAuthStore.getState().session).toBeNull();
  expect(useAuthStore.getState().notice).toBe('unauthorized');
  expect(screen.queryByLabelText('Nome da categoria')).not.toBeInTheDocument();
});

it('valida nome em branco e limites antes de enviar', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(json([])));
  vi.stubGlobal('fetch', fetch);
  setup();
  await screen.findByText('A primeira descoberta pode começar com você.');
  fireEvent.change(screen.getByLabelText('Nome da categoria'), {
    target: { value: '   ' },
  });
  submit();
  expect(
    await screen.findByText('Informe um nome com até 80 caracteres.'),
  ).toBeInTheDocument();
  await vi.waitFor(() =>
    expect(screen.getByLabelText('Nome da categoria')).toHaveFocus(),
  );
  fireEvent.change(screen.getByLabelText('Nome da categoria'), {
    target: { value: 'a'.repeat(81) },
  });
  fireEvent.change(screen.getByLabelText(/Descrição/), {
    target: { value: 'b'.repeat(256) },
  });
  submit();
  expect(
    await screen.findByText('Use até 255 caracteres na descrição.'),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nome da categoria'), {
    target: { value: 'Oceanos' },
  });
  expect(screen.getByLabelText('Nome da categoria')).toHaveFocus();
  expect(
    fetch.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(0);
});

it('confirma o status pendente do backend sem inserir a sugestão na lista aprovada', async () => {
  const fetch = vi
    .fn()
    .mockImplementation((_url: string, options: RequestInit) =>
      Promise.resolve(
        options.method === 'POST'
          ? json({ ...category, nome: 'Oceanos', status: 'PENDENTE' }, 201)
          : json([category]),
      ),
    );
  vi.stubGlobal('fetch', fetch);
  setup();
  await screen.findByRole('heading', { name: 'Astronomia' });
  fillForm();
  submit();
  const heading = await screen.findByRole('heading', {
    name: 'Sugestão recebida!',
  });
  const success = heading.closest('[role="status"]')!;
  expect(
    within(success as HTMLElement).getByText('Pendente de revisão'),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Oceanos' }),
  ).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    '/api/categorias',
    expect.objectContaining({
      body: JSON.stringify({ nome: 'Oceanos', descricao: 'A vida nos mares.' }),
    }),
  );
  await vi.waitFor(() => expect(success).toHaveFocus());
  fireEvent.click(
    screen.getByRole('button', { name: 'Sugerir outra categoria' }),
  );
  expect(screen.getByLabelText('Nome da categoria')).toHaveValue('');
  await vi.waitFor(() =>
    expect(screen.getByLabelText('Nome da categoria')).toHaveFocus(),
  );
});

it('mantém os campos e destaca o nome quando o backend retorna conflito', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((_url: string, options: RequestInit) =>
        Promise.resolve(
          options.method === 'POST'
            ? json({ mensagem: 'Categoria já cadastrada' }, 409)
            : json([]),
        ),
      ),
  );
  setup();
  fillForm();
  submit();
  expect(
    await screen.findByText(
      'Já existe uma categoria com esse nome. Experimente outro assunto ou nome.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Nome da categoria')).toHaveValue(' Oceanos ');
  expect(screen.getByLabelText(/Descrição/)).toHaveValue(' A vida nos mares. ');
  await vi.waitFor(() =>
    expect(screen.getByLabelText('Nome da categoria')).toHaveFocus(),
  );
});

it('associa o erro de validação do backend à descrição', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((_url: string, options: RequestInit) =>
      Promise.resolve(
        options.method === 'POST'
          ? json(
              {
                mensagem: 'Dados inválidos',
                campos: { descricao: 'Revise a descrição informada' },
              },
              400,
            )
          : json([]),
      ),
    ),
  );
  setup();
  fillForm();
  submit();
  expect(
    await screen.findByText('Revise a descrição informada'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/Descrição/)).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await vi.waitFor(() =>
    expect(screen.getByLabelText(/Descrição/)).toHaveFocus(),
  );
});

it('mantém a sugestão e a sessão quando o envio retorna 403', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((_url: string, options: RequestInit) =>
        Promise.resolve(
          options.method === 'POST'
            ? json({ erro: 'Acesso negado' }, 403)
            : json([]),
        ),
      ),
  );
  setup();
  fillForm();
  submit();
  expect(
    await screen.findByText(
      'Sua conta não tem permissão para enviar sugestões.',
    ),
  ).toBeInTheDocument();
  expect(useAuthStore.getState().session).not.toBeNull();
  expect(screen.getByLabelText('Nome da categoria')).toHaveValue(' Oceanos ');
});

it('não repete POST com falha de rede e preserva o formulário', async () => {
  const fetch = vi
    .fn()
    .mockImplementation((_url: string, options: RequestInit) =>
      options.method === 'POST'
        ? Promise.reject(new TypeError('offline'))
        : Promise.resolve(json([])),
    );
  vi.stubGlobal('fetch', fetch);
  setup();
  fillForm();
  submit();
  await screen.findByText(
    'Não conseguimos confirmar o envio. Confira sua conexão e tente novamente. Seus campos foram mantidos.',
  );
  expect(
    fetch.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
  expect(screen.getByLabelText('Nome da categoria')).toHaveValue(' Oceanos ');
  expect(
    screen.getByRole('button', { name: 'Enviar para revisão' }),
  ).toBeEnabled();
});

it('bloqueia envio duplicado, cancela ao sair e descarta sucesso tardio', async () => {
  let finish!: (response: Response) => void;
  const fetch = vi
    .fn()
    .mockImplementation((_url: string, options: RequestInit) =>
      options.method === 'POST'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(json([])),
    );
  vi.stubGlobal('fetch', fetch);
  const page = setup();
  fillForm();
  const form = screen
    .getByRole('button', { name: 'Enviar para revisão' })
    .closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  const posts = fetch.mock.calls.filter(
    ([, options]) => options.method === 'POST',
  );
  expect(posts).toHaveLength(1);
  expect(
    screen.getByRole('button', { name: 'Enviando sugestão…' }),
  ).toBeDisabled();
  page.unmount();
  expect(posts[0][1].signal.aborted).toBe(true);
  await act(async () => finish(json({ ...category, status: 'PENDENTE' }, 201)));
  expect(page.client.getMutationCache().getAll()).toHaveLength(0);
});
