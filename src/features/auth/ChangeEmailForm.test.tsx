import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/http';
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

it.each([403, 429, 503])(
  'mantém a edição disponível se o envio falhar (%i)',
  async (status) => {
    vi.mocked(requestEmailChange).mockRejectedValueOnce(
      new ApiError(status, 'Não foi possível enviar o código.'),
    );
    vi.mocked(requestEmailChange).mockResolvedValueOnce(undefined);
    abrir();
    preencher('novo@example.test', 'senha');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      status === 503
        ? 'O serviço está indisponível no momento. Tente novamente em instantes.'
        : 'Não foi possível enviar o código.',
    );
    expect(screen.getByRole('textbox', { name: 'Novo e-mail' })).toHaveValue(
      'novo@example.test',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(
      await screen.findByRole('textbox', {
        name: 'Código de confirmação da troca',
      }),
    ).toBeInTheDocument();
    expect(requestEmailChange).toHaveBeenCalledTimes(2);
  },
);

it('mantém a etapa de confirmação quando a API rejeita o código', async () => {
  vi.mocked(requestEmailChange).mockResolvedValue(undefined);
  vi.mocked(confirmEmailChange).mockRejectedValueOnce(
    new ApiError(400, 'Código expirado.'),
  );
  abrir();
  preencher('novo@example.test', 'senha');
  const codigo = await screen.findByRole('textbox', {
    name: 'Código de confirmação da troca',
  });
  fireEvent.change(codigo, { target: { value: '1234567890' } });
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar troca de e-mail' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Código expirado.',
  );
  expect(codigo).toBeEnabled();
  expect(
    screen.getByRole('button', { name: 'Informar e-mail novamente' }),
  ).toBeEnabled();
});
