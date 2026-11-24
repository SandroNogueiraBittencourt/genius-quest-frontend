import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';
import { useAuthStore } from './store';

const email = 'lia@example.test';
const codigo = '01234-56789';

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), {
    target: { value },
  });
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => useAuthStore.setState({ session: null, notice: null }));
afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});

it('retoma a confirmação pelo login, mostra erro e aceita o reenvio sem corpo', async () => {
  window.history.replaceState({}, '', '/?view=login');
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      json(
        {
          status: 'UP',
          application: 'Genius Quest Backend',
          timestamp: '2026-10-25',
        },
        200,
      ),
    )
    .mockResolvedValueOnce(
      json({ mensagem: 'Confirme seu e-mail antes de entrar' }, 403),
    )
    .mockResolvedValueOnce(
      json(
        {
          mensagem:
            'Código inválido, expirado ou já utilizado. Confira o código ou solicite outro.',
        },
        400,
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetch);
  render(<App />);
  fill('E-mail', email);
  fill('Senha', 'SenhaTeste123!');
  click('Entrar na minha conta');

  await screen.findByRole('heading', { name: 'Confirme seu e-mail' });
  fill('Código de verificação', codigo);
  click('Confirmar e-mail');
  expect(
    await screen.findByText(
      'Código inválido, expirado ou já utilizado. Confira o código ou solicite outro.',
    ),
  ).toBeInTheDocument();

  click('Reenviar código');
  expect(
    await screen.findByText(/você receberá um novo código/i),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Código de verificação')).toHaveValue('');
  expect(fetch).toHaveBeenNthCalledWith(
    4,
    '/api/auth/reenviar-verificacao',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  );
});
