import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';
import { useAuthStore } from '../auth/store';
import { useRoomStore } from '../room/store';

const category = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Astronomia',
  descricao: 'Uma conversa sobre o universo.',
  status: 'APROVADA',
  criadoEm: '2026-10-25T12:00:00Z',
  atualizadoEm: '2026-10-25T12:00:00Z',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function health() {
  return json({
    status: 'UP',
    application: 'Genius Quest Backend',
    timestamp: '2026-10-25',
  });
}
function fillLogin(email = 'lia@example.test') {
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), {
    target: { value: 'SenhaTeste123!' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
}
beforeEach(() => {
  window.history.replaceState({}, '', '/?view=categories');
  useAuthStore.setState({ session: null, notice: null });
  useRoomStore.getState().leave();
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('volta às categorias após login e recarrega os dados ao trocar de conta', async () => {
  let loginCount = 0;
  const fetch = vi
    .fn()
    .mockImplementation((url: string, options: RequestInit) => {
      if (url.endsWith('/health')) return Promise.resolve(health());
      if (url.endsWith('/auth/login')) {
        loginCount++;
        return Promise.resolve(
          json({ token: 'jwt-' + loginCount, tipo: 'Bearer', expiraEm: 3600 }),
        );
      }
      if (url.endsWith('/categorias/aprovadas'))
        return Promise.resolve(
          json([
            { ...category, nome: loginCount === 1 ? 'Astronomia' : 'História' },
          ]),
        );
      if (url.endsWith('/categorias') && options.method === 'POST')
        return Promise.resolve(
          json({ ...category, nome: 'Oceanos', status: 'PENDENTE' }, 201),
        );
      return Promise.resolve(json({ erro: 'Rota inesperada no teste' }, 404));
    });
  vi.stubGlobal('fetch', fetch);
  render(<App />);
  expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(
    screen.queryByText('Demonstração', { exact: true }),
  ).not.toBeInTheDocument();
  expect(
    fetch.mock.calls.filter(([url]) => String(url).includes('/categorias')),
  ).toHaveLength(0);
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar para ver categorias' }),
  );
  fillLogin();
  await screen.findByRole('heading', { name: 'Astronomia' });
  expect(window.location.search).toBe('?view=categories');
  expect(document.title).toBe('Categorias · Genius Quest');
  expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  fireEvent.change(screen.getByLabelText('Nome da categoria'), {
    target: { value: 'Oceanos' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar para revisão' }));
  await screen.findByRole('heading', { name: 'Sugestão recebida!' });
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  fireEvent.click(screen.getByRole('link', { name: 'Categorias' }));
  expect(screen.queryByText('Oceanos')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Astronomia' }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar para ver categorias' }),
  );
  fillLogin('outro@example.test');
  await screen.findByRole('heading', { name: 'História' });
  expect(
    screen.queryByRole('heading', { name: 'Astronomia' }),
  ).not.toBeInTheDocument();
  const lastRead = fetch.mock.calls
    .filter(([url]) => String(url).endsWith('/categorias/aprovadas'))
    .at(-1);
  expect(lastRead?.[1]).toMatchObject({
    headers: expect.objectContaining({ Authorization: 'Bearer jwt-2' }),
  });
});

it('cancelamento de consulta ao navegar impede conteúdo tardio na abertura', async () => {
  useAuthStore
    .getState()
    .start(
      { token: 'jwt', tipo: 'Bearer', expiraEm: 3600 },
      'lia@example.test',
    );
  let finish!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, options: RequestInit) => {
      if (url.endsWith('/health')) return Promise.resolve(health());
      signal = options.signal as AbortSignal;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }),
  );
  render(<App />);
  await screen.findByText('Buscando categorias…');
  fireEvent.click(screen.getByRole('link', { name: 'Início' }));
  expect(signal?.aborted).toBe(true);
  await act(async () => finish(json([category])));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Cada pergunta',
  );
  expect(
    screen.queryByRole('heading', { name: 'Astronomia' }),
  ).not.toBeInTheDocument();
});

it('sair da conta durante envio cancela a tela e impede confirmação na próxima sessão', async () => {
  useAuthStore
    .getState()
    .start(
      { token: 'jwt', tipo: 'Bearer', expiraEm: 3600 },
      'lia@example.test',
    );
  let finish!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, options: RequestInit) => {
      if (url.endsWith('/health')) return Promise.resolve(health());
      if (options.method === 'POST') {
        signal = options.signal as AbortSignal;
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      }
      return Promise.resolve(json([category]));
    }),
  );
  render(<App />);
  await screen.findByRole('heading', { name: 'Astronomia' });
  fireEvent.change(screen.getByLabelText('Nome da categoria'), {
    target: { value: 'Oceanos' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar para revisão' }));
  expect(
    screen.getByRole('button', { name: 'Enviando sugestão…' }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  expect(signal?.aborted).toBe(true);
  await act(async () =>
    finish(json({ ...category, nome: 'Oceanos', status: 'PENDENTE' }, 201)),
  );
  fireEvent.click(screen.getByRole('link', { name: 'Categorias' }));
  expect(
    screen.getByRole('button', { name: 'Entrar para ver categorias' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('Sugestão recebida!')).not.toBeInTheDocument();
  expect(useAuthStore.getState().session).toBeNull();
});
