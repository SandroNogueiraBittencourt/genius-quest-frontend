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
  await screen.findByText(
    'Conta criada! Entre com seu e-mail e senha para continuar.',
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
  fireEvent.click(screen.getByRole('link', { name: 'Minha conta' }));
  expect(
    screen.getByRole('heading', { name: 'Você está conectado.' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sair da minha conta' }));
  await screen.findByText('Você saiu da sua conta.');
  expect(useAuthStore.getState().session).toBeNull();
  expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
});
