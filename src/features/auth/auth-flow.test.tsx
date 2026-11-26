import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';
import { useAuthStore } from './store';
import { useRoomStore } from '../room/store';
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  useAuthStore.setState({ session: null, notice: null });
  useRoomStore.getState().leave();
});
afterEach(() => vi.unstubAllGlobals());
it('percorre cadastro, login, conta conectada e saída pela navegação real', async () => {
  const fetch = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/auth/logout') || url.endsWith('/auth/verificar-email'))
      return Promise.resolve(new Response(null, { status: 204 }));
    const body = url.endsWith('/health')
      ? {
          status: 'UP',
          application: 'Genius Quest Backend',
          timestamp: '2026-10-25',
        }
      : url.endsWith('/usuarios')
        ? {
            id: 'id',
            nome: 'Lia Teste',
            email: 'lia@example.test',
            perfil: 'USUARIO',
            moedas: 0,
            ativo: true,
            criadoEm: '2026-10-25',
            atualizadoEm: '2026-10-25',
            emailVerificado: false,
          }
        : { token: 'jwt', tipo: 'Bearer', expiraEm: 3600 };
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: url.endsWith('/usuarios') ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  vi.stubGlobal('fetch', fetch);
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }));
  fireEvent.change(screen.getByLabelText('Como podemos chamar você?'), {
    target: { value: 'Lia Teste' },
  });
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'lia@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), {
    target: { value: 'SenhaTeste123!' },
  });
  fireEvent.change(screen.getByLabelText('Confirme a senha'), {
    target: { value: 'SenhaTeste123!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));
  await screen.findByRole('heading', { name: 'Confirme seu e-mail' });
  expect(
    screen.queryByLabelText('E-mail', { exact: true }),
  ).not.toBeInTheDocument();
  expect(window.location.search).toBe('?view=verify-email');
  fireEvent.change(screen.getByLabelText('Código de verificação'), {
    target: { value: '01234-56789' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar e-mail' }));
  await screen.findByText(
    'E-mail confirmado! Entre com seu e-mail e senha para continuar.',
  );
  expect(fetch).toHaveBeenCalledWith(
    '/api/auth/verificar-email',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'lia@example.test',
        codigo: '0123456789',
      }),
    }),
  );
  expect(window.location.search).toBe('?view=login');
  expect(screen.getByLabelText('E-mail')).toHaveValue('lia@example.test');
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), {
    target: { value: 'SenhaTeste123!' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  await screen.findByRole('button', { name: 'Sair' });
  fireEvent.click(screen.getByRole('link', { name: 'Minha área' }));
  fireEvent.click(screen.getByRole('link', { name: 'Minha conta' }));
  expect(
    screen.getByRole('heading', { name: 'Você está conectado.' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sair da minha conta' }));
  await screen.findByText('Você saiu da sua conta.');
  expect(fetch).toHaveBeenCalledWith(
    '/api/auth/logout',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
    }),
  );
  expect(useAuthStore.getState().session).toBeNull();
  expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
});

function abrirMinhaConta() {
  const id = '19beaa15-d762-4bb5-9db7-db69b76f7520';
  const token =
    'header.' + btoa(JSON.stringify({ usuarioId: id })) + '.assinatura';
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, 'lia@example.test');
  window.history.replaceState({}, '', '/?view=login');
  render(<App />);
  return { id, token };
}

function preencherTroca(novaSenha: string, confirmacao = novaSenha) {
  fireEvent.change(screen.getByLabelText('Senha atual'), {
    target: { value: 'senha-antiga' },
  });
  fireEvent.change(screen.getByLabelText('Nova senha', { exact: true }), {
    target: { value: novaSenha },
  });
  fireEvent.change(screen.getByLabelText('Confirme a nova senha'), {
    target: { value: confirmacao },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
}

it('valida a troca de senha e encerra a sessão ao concluir', async () => {
  const fetch = vi.fn(async (url: string) => {
    if (!url.endsWith('/senha')) return new Response(null, { status: 404 });
    const tentativas = fetch.mock.calls.filter(([path]) =>
      path.endsWith('/senha'),
    );
    return tentativas.length === 1
      ? new Response(
          JSON.stringify({ mensagem: 'A senha atual está incorreta.' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      : new Response(null, { status: 204 });
  });
  vi.stubGlobal('fetch', fetch);
  const { id, token } = abrirMinhaConta();

  preencherTroca('senhafraca', 'diferente');
  expect(screen.getByLabelText('Nova senha', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(
    screen.getByText('As novas senhas precisam ser iguais.'),
  ).toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/senha'))).toBe(false);

  preencherTroca('NovaSenha123!');
  expect(
    await screen.findByText('A senha atual está incorreta.'),
  ).toBeInTheDocument();
  expect(useAuthStore.getState().session?.token).toBe(token);

  preencherTroca('NovaSenha123!');
  expect(
    await screen.findByText(
      'Senha alterada. Entre novamente com sua nova senha.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  ).toBeInTheDocument();
  expect(useAuthStore.getState().session).toBeNull();
  expect(fetch).toHaveBeenCalledWith(
    '/api/usuarios/' + id + '/senha',
    expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ Authorization: 'Bearer ' + token }),
      body: JSON.stringify({
        senhaAtual: 'senha-antiga',
        novaSenha: 'NovaSenha123!',
      }),
    }),
  );
});

it('abre a recuperação por e-mail a partir de Minha conta', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
  );
  abrirMinhaConta();

  fireEvent.click(screen.getByRole('link', { name: 'Esqueci minha senha' }));
  expect(
    screen.getByRole('button', { name: 'Enviar código de recuperação' }),
  ).toBeInTheDocument();
});
