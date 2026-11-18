import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';
import { PasswordRecovery } from './PasswordRecovery';
import { requestPasswordReset, resetPassword } from './api';
import { useAuthStore } from './store';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  useAuthStore.setState({ session: null, notice: null });
});
afterEach(() => vi.unstubAllGlobals());
function setup(reset = false) {
  if (reset)
    window.history.replaceState({}, '', '/redefinir-senha?token=email-token');
  return render(
    <PasswordRecovery
      mode={reset ? 'reset-password' : 'forgot-password'}
      onNavigate={vi.fn()}
    />,
  );
}
function fill(password = ' senha123 ', confirmation = password) {
  fireEvent.change(screen.getByLabelText('Nova senha'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
    target: { value: confirmation },
  });
}
it('envia os contratos públicos sem autenticação e preserva senha e token', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ mensagem: 'Mensagem genérica' }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  await requestPasswordReset(' LIA@EXAMPLE.TEST ');
  await resetPassword('token+exato', ' senha123 ');
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    '/api/auth/esqueci-senha',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'lia@example.test' }),
    }),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    '/api/auth/redefinir-senha',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'token+exato', novaSenha: ' senha123 ' }),
    }),
  );
  expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
});
it('valida e-mail e confirma a solicitação com mensagem genérica', async () => {
  const fetch = vi.fn().mockResolvedValue(json({ mensagem: 'ok' }));
  vi.stubGlobal('fetch', fetch);
  setup();
  fireEvent.click(
    screen.getByRole('button', { name: 'Enviar link de recuperação' }),
  );
  expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'invalido' },
  });
  fireEvent.submit(
    screen
      .getByRole('button', { name: 'Enviar link de recuperação' })
      .closest('form')!,
  );
  expect(screen.getByLabelText('E-mail')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'lia@example.test' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Enviar link de recuperação' }),
  );
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Se houver uma conta com este e-mail',
  );
});
it('valida tamanho e confirmação antes de redefinir e aceita 204', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  setup(true);
  fill('curta', 'diferente');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(
    screen.getByText('Use uma senha entre 8 e 72 caracteres.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('As senhas precisam ser iguais.'),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Senha redefinida!',
  );
  expect(window.location.search).toBe('');
  expect(useAuthStore.getState().session).toBeNull();
});
it('bloqueia token ausente sem chamar a API', () => {
  vi.stubGlobal('fetch', vi.fn());
  render(<PasswordRecovery mode="reset-password" onNavigate={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Link inválido');
  expect(
    screen.getByRole('link', { name: 'Solicitar novo link' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Salvar nova senha' }),
  ).not.toBeInTheDocument();
});
it('oferece novo link quando o backend recusa token inválido, expirado ou usado', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ mensagem: 'Token inválido' }, 400)),
  );
  setup(true);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Link inválido, expirado ou já utilizado',
  );
  expect(
    screen.getByRole('link', { name: 'Solicitar novo link' }),
  ).toBeInTheDocument();
});
it('permite tentar novamente após falha de conexão', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  );
  setup(true);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Não foi possível conectar à API',
  );
  expect(
    screen.getByRole('button', { name: 'Salvar nova senha' }),
  ).toBeEnabled();
  expect(screen.getByLabelText('Nova senha')).toHaveValue(' senha123 ');
});
it('impede envio duplicado e aborta ao sair da tela', async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn().mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done;
    }),
  );
  vi.stubGlobal('fetch', fetch);
  const page = setup(true);
  fill();
  const form = screen
    .getByRole('button', { name: 'Salvar nova senha' })
    .closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(fetch).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  page.unmount();
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => resolve(new Response(null, { status: 204 })));
});
it('abre o caminho do e-mail e volta ao login removendo o token', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ status: 'UP' })));
  window.history.replaceState({}, '', '/redefinir-senha?token=abc');
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Redefinir senha' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Voltar para entrar' }));
  expect(window.location.pathname).toBe('/');
  expect(window.location.search).toBe('?view=login');
  fireEvent.click(screen.getByRole('link', { name: 'Esqueci minha senha' }));
  expect(
    screen.getByRole('heading', { name: 'Esqueci minha senha' }),
  ).toHaveFocus();
  expect(window.location.search).toBe('?view=forgot-password');
});
