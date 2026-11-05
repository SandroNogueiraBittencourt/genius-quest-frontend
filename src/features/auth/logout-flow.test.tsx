import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';
import { useAuthStore } from './store';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  useAuthStore.setState({ session: null, notice: null });
});
afterEach(() => vi.unstubAllGlobals());

function start(token = 'token-anterior') {
  useAuthStore.getState().start(
    { token, tipo: 'Bearer', expiraEm: 3600 },
    'usuario@geniusquest.test',
  );
}

function health(): Response {
  return new Response(
    JSON.stringify({
      status: 'UP',
      application: 'Genius Quest Backend',
      timestamp: '2026-11-05T12:00:00Z',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}

it('envia o JWT real no logout e só limpa a sessão após o retorno 204', async () => {
  let complete!: (response: Response) => void;
  const fetch = vi.fn().mockImplementation((url: string) =>
    url.endsWith('/auth/logout')
      ? new Promise<Response>((resolve) => {
          complete = resolve;
        })
      : Promise.resolve(health()),
  );
  vi.stubGlobal('fetch', fetch);
  start();
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  expect(useAuthStore.getState().session?.token).toBe('token-anterior');
  expect(screen.getByRole('button', { name: 'Saindo…' })).toBeDisabled();
  expect(fetch).toHaveBeenCalledWith(
    '/api/auth/logout',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer token-anterior',
      }),
    }),
  );

  await act(async () => complete(new Response(null, { status: 204 })));
  expect(useAuthStore.getState().session).toBeNull();
  expect(await screen.findByText('Você saiu da sua conta.')).toBeInTheDocument();
});

it('não afirma logout remoto quando a API falha; permite tentar novamente', async () => {
  let attempts = 0;
  const fetch = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/auth/logout')) {
      attempts++;
      return Promise.resolve(
        attempts === 1
          ? new Response('{}', { status: 503 })
          : new Response(null, { status: 204 }),
      );
    }
    return Promise.resolve(health());
  });
  vi.stubGlobal('fetch', fetch);
  start();
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Não foi possível encerrar sua sessão no servidor',
  );
  expect(useAuthStore.getState().session?.token).toBe('token-anterior');
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  await screen.findByText('Você saiu da sua conta.');
  expect(attempts).toBe(2);
});

it('limpa a sessão local quando o backend informa que o token já é inválido', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/auth/logout')
          ? new Response(null, { status: 401 })
          : health(),
      ),
    ),
  );
  start();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  expect(
    await screen.findByText(
      'Sua sessão não está mais válida. Entre novamente.',
    ),
  ).toBeInTheDocument();
  expect(useAuthStore.getState().session).toBeNull();
});

it('a resposta de logout de uma sessão antiga não encerra um novo login', async () => {
  let complete!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) =>
      url.endsWith('/auth/logout')
        ? new Promise<Response>((resolve) => {
            complete = resolve;
          })
        : Promise.resolve(health()),
    ),
  );
  start();
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  act(() => start('novo-jwt'));
  await act(async () => complete(new Response(null, { status: 204 })));
  await waitFor(() =>
    expect(useAuthStore.getState().session?.token).toBe('novo-jwt'),
  );
  expect(screen.queryByText('Você saiu da sua conta.')).not.toBeInTheDocument();
});
