import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthPage, type AuthMode } from './AuthPage';
import { useAuthStore } from './store';
beforeEach(() => useAuthStore.setState({ session: null, notice: null }));
afterEach(() => vi.unstubAllGlobals());
const user = {
  id: 'id',
  nome: 'Lia Teste',
  email: 'lia@example.test',
  perfil: 'USUARIO',
  moedas: 0,
  ativo: true,
  criadoEm: '2026-10-25',
  atualizadoEm: '2026-10-25',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function setup(mode: AuthMode = 'login') {
  const props = {
    mode,
    onSwitch: vi.fn(),
    onRegistered: vi.fn(),
    onSignedIn: vi.fn(),
  };
  const view = render(<AuthPage {...props} />);
  return { ...view, ...props };
}
function fillLogin() {
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'lia@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), {
    target: { value: 'SenhaTeste123!' },
  });
}
it('valida os campos antes de chamar a API e move o foco para o erro', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  setup('register');
  fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));
  expect(
    await screen.findByText('Informe um nome entre 3 e 100 caracteres.'),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  await vi.waitFor(() =>
    expect(screen.getByLabelText('Como podemos chamar você?')).toHaveFocus(),
  );
});
it('cadastra com o contrato real sem abrir sessão automaticamente', async () => {
  const fetch = vi.fn().mockResolvedValue(json(user, 201));
  vi.stubGlobal('fetch', fetch);
  const page = setup('register');
  fireEvent.change(screen.getByLabelText('Como podemos chamar você?'), {
    target: { value: ' Lia Teste ' },
  });
  fillLogin();
  fireEvent.change(screen.getByLabelText('Confirme a senha'), {
    target: { value: 'SenhaTeste123!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));
  await vi.waitFor(() =>
    expect(page.onRegistered).toHaveBeenCalledWith('lia@example.test'),
  );
  expect(useAuthStore.getState().session).toBeNull();
  expect(fetch).toHaveBeenCalledWith(
    '/api/usuarios',
    expect.objectContaining({
      body: JSON.stringify({
        nome: 'Lia Teste',
        email: 'lia@example.test',
        senha: 'SenhaTeste123!',
      }),
    }),
  );
});
it('explica e-mail duplicado e associa o erro ao campo', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ mensagem: 'E-mail já cadastrado' }, 409)),
  );
  setup('register');
  fireEvent.change(screen.getByLabelText('Como podemos chamar você?'), {
    target: { value: 'Lia Teste' },
  });
  fillLogin();
  fireEvent.change(screen.getByLabelText('Confirme a senha'), {
    target: { value: 'SenhaTeste123!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));
  expect(
    await screen.findByText(
      'Este e-mail já está cadastrado. Entre na sua conta.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('E-mail')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});
it('credenciais inválidas não iniciam sessão e permitem nova tentativa', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ erro: 'Não autenticado' }, 401))
    .mockResolvedValueOnce(
      json({ token: 'jwt', tipo: 'Bearer', expiraEm: 3600 }),
    );
  vi.stubGlobal('fetch', fetch);
  const page = setup();
  fillLogin();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'E-mail ou senha inválidos',
  );
  expect(useAuthStore.getState().session).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  await vi.waitFor(() => expect(page.onSignedIn).toHaveBeenCalledOnce());
  expect(useAuthStore.getState().session?.email).toBe('lia@example.test');
});
it('apresenta erros por campo retornados pelo backend', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      json(
        {
          mensagem: 'Dados inválidos',
          campos: { email: 'Confira o e-mail informado' },
        },
        400,
      ),
    ),
  );
  setup();
  fillLogin();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  expect(
    await screen.findByText('Confira o e-mail informado'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('E-mail')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});
it('trata indisponibilidade da API sem perder o formulário', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  );
  setup();
  fillLogin();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Não foi possível conectar à API',
  );
  expect(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  ).toBeEnabled();
});
it('permite conferir e ocultar a senha com indicação acessível', () => {
  setup();
  const input = screen.getByLabelText('Senha', { exact: true });
  expect(input).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
  expect(input).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
it('impede envio duplicado e descarta login concluído depois de sair da tela', async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn().mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done;
    }),
  );
  vi.stubGlobal('fetch', fetch);
  const page = setup();
  fillLogin();
  const form = screen
    .getByRole('button', { name: 'Entrar na minha conta' })
    .closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(fetch).toHaveBeenCalledOnce();
  const signal = fetch.mock.calls[0][1].signal;
  expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  page.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => {
    resolve(json({ token: 'late-jwt', tipo: 'Bearer', expiraEm: 3600 }));
  });
  expect(useAuthStore.getState().session).toBeNull();
  expect(page.onSignedIn).not.toHaveBeenCalled();
});
