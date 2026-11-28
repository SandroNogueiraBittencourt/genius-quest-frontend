import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { confirmEmailChange, requestEmailChange } from './api';
import { ChangeEmailForm } from './ChangeEmailForm';

vi.mock('./api', () => ({
  confirmEmailChange: vi.fn(),
  requestEmailChange: vi.fn(),
}));

const session = {
  email: 'atual@example.test',
  token: 'token-teste',
  expiresAt: Date.now() + 60000,
};

beforeEach(() => vi.resetAllMocks());

function abrir() {
  render(
    <ChangeEmailForm
      session={session}
      userId="usuario-teste"
      disabled={false}
      onEmailChanged={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Alterar e-mail' }));
}

function preencher(email: string, senha: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Novo e-mail' }), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('Senha atual para trocar e-mail'), {
    target: { value: senha },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
}

it.each([
  ['invalido', 'senha', 'Informe um novo e-mail válido.'],
  ['ATUAL@example.test', 'senha', 'Informe um e-mail diferente do atual.'],
  ['novo@example.test', '', 'Informe sua senha atual.'],
  ['novo@example.test', 'á'.repeat(37), 'Informe sua senha atual.'],
])('valida os dados antes de pedir o código (%j)', (email, senha, mensagem) => {
  abrir();
  preencher(email, senha);
  expect(screen.getByRole('alert')).toHaveTextContent(mensagem);
  expect(requestEmailChange).not.toHaveBeenCalled();
});

it('descarta senha e endereço digitados ao cancelar a solicitação', () => {
  abrir();
  fireEvent.change(screen.getByRole('textbox', { name: 'Novo e-mail' }), {
    target: { value: 'novo@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Senha atual para trocar e-mail'), {
    target: { value: 'senha' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Alterar e-mail' }));
  expect(screen.getByRole('textbox', { name: 'Novo e-mail' })).toHaveValue('');
  expect(screen.getByLabelText('Senha atual para trocar e-mail')).toHaveValue(
    '',
  );
});

it('rejeita código incompleto e permite voltar para informar outro endereço', async () => {
  vi.mocked(requestEmailChange).mockResolvedValue(undefined);
  abrir();
  preencher('novo@example.test', 'senha');
  const codigo = await screen.findByRole('textbox', {
    name: 'Código de confirmação da troca',
  });
  fireEvent.change(codigo, { target: { value: '12345' } });
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar troca de e-mail' }),
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Informe o código de 10 dígitos',
  );
  expect(confirmEmailChange).not.toHaveBeenCalled();

  fireEvent.click(
    screen.getByRole('button', { name: 'Informar e-mail novamente' }),
  );
  expect(screen.getByRole('textbox', { name: 'Novo e-mail' })).toHaveValue('');
  expect(screen.queryByRole('alert')).toBeNull();
});
