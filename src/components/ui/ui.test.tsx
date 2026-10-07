import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Button, Input, ProgressBar } from './index';
it('bloqueia cliques enquanto a ação está carregando', () => {
  const action = vi.fn();
  render(
    <Button busy onClick={action}>
      Confirmar resposta
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Preparando…' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  fireEvent.click(button);
  expect(action).not.toHaveBeenCalled();
});
it('exige type submit explícito para enviar um formulário', () => {
  const submit = vi.fn((e) => e.preventDefault());
  render(
    <form onSubmit={submit}>
      <Button>Cancelar</Button>
      <Button type="submit">Enviar</Button>
    </form>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(submit).toHaveBeenCalledTimes(1);
});
it('associa nome e ajuda ao campo e respeita descrições externas', () => {
  render(
    <>
      <p id="context">Contexto da sala.</p>
      <Input
        label="Nome"
        hint="Seu nome ou apelido."
        aria-describedby="context"
      />
    </>,
  );
  const field = screen.getByRole('textbox', { name: 'Nome' });
  expect(field).toHaveAccessibleDescription(
    'Contexto da sala. Seu nome ou apelido.',
  );
});
it('sinaliza o erro do campo sem depender da cor', () => {
  render(<Input label="Código" error="Confira o código." />);
  expect(screen.getByRole('textbox', { name: 'Código' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Confira o código.');
});
it('normaliza o progresso para um intervalo acessível válido', () => {
  const { rerender } = render(
    <ProgressBar label="Rodada" value={12} max={10} />,
  );
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '10',
  );
  rerender(<ProgressBar label="Rodada" value={NaN} max={0} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1');
});
