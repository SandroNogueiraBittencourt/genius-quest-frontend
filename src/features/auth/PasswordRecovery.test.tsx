import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';
import { PasswordRecovery } from './PasswordRecovery';
import { requestPasswordReset, resetPassword } from './api';
import { useAuthStore } from './store';
const CODIGO = 'abcd-2345 efgh-6789';
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
  if (reset) window.history.replaceState({}, '', '/redefinir-senha');
  return render(
    <PasswordRecovery
      mode={reset ? 'reset-password' : 'forgot-password'}
      onNavigate={vi.fn()}
    />,
  );
}
function fill(password = ' Senha123! ', confirmation = password) {
  fireEvent.change(screen.getByLabelText('Código de recuperação'), {
    target: { value: CODIGO },
  });
  fireEvent.change(screen.getByLabelText('Nova senha'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
    target: { value: confirmation },
  });
}
it('envia o código em POST sem autenticação ou querystring', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ mensagem: 'Mensagem genérica' }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  await requestPasswordReset(' LIA@EXAMPLE.TEST ');
  await resetPassword('ABCD2345EFGH6789', ' Senha123! ');
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
      body: JSON.stringify({
        token: 'ABCD2345EFGH6789',
        novaSenha: ' Senha123! ',
      }),
    }),
  );
  expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
});
it('pede código com mensagem que não revela se a conta existe', async () => {
  const fetch = vi.fn().mockResolvedValue(json({ mensagem: 'ok' }));
  vi.stubGlobal('fetch', fetch);
  setup();
  fireEvent.click(
    screen.getByRole('button', { name: 'Enviar código de recuperação' }),
  );
  expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'lia@example.test' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Enviar código de recuperação' }),
  );
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Se houver uma conta com este e-mail',
  );
});
it('valida código e senhas antes da chamada e aceita 204', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  setup(true);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(
    screen.getByText('Informe o código de 16 caracteres recebido por e-mail.'),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fill('senhafraca123');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(screen.getByLabelText('Nova senha')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(fetch).not.toHaveBeenCalled();
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Senha redefinida!',
  );
  expect(fetch.mock.calls[0][1].body).toBe(
    JSON.stringify({ token: 'ABCD2345EFGH6789', novaSenha: ' Senha123! ' }),
  );
  expect(window.location.search).toBe('');
  expect(useAuthStore.getState().session).toBeNull();
});
it('permite inserir código sem URL e oferece solicitar outro', () => {
  vi.stubGlobal('fetch', vi.fn());
  setup(true);
  expect(screen.getByLabelText('Código de recuperação')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Solicitar novo código' }),
  ).toBeInTheDocument();
  expect(window.location.search).toBe('');
});
it('não distingue código inválido, expirado ou consumido', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ mensagem: 'Invalido' }, 400)),
  );
  setup(true);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Código inválido, expirado ou já utilizado',
  );
  expect(
    screen.getByRole('link', { name: 'Solicitar novo código' }),
  ).toBeInTheDocument();
});
it('permite nova tentativa após indisponibilidade da API', async () => {
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
});
it('impede envio duplo e cancela quando a tela desaparece', async () => {
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
  page.unmount();
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => resolve(new Response(null, { status: 204 })));
});
it('higieniza URL antiga e retorna ao login', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ status: 'UP' })));
  window.history.replaceState({}, '', '/redefinir-senha?token=LEGACYSECRET');
  render(<App />);
  expect(window.location.search).toBe('');
  expect(
    screen.getByRole('heading', { name: 'Redefinir senha' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Voltar para entrar' }));
  expect(window.location.pathname).toBe('/');
  expect(window.location.search).toBe('?view=login');
});
