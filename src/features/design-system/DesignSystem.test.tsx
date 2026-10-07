import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DesignSystem } from './DesignSystem';
it('permite avançar e voltar o progresso demonstrativo', () => {
  render(<DesignSystem apiStatus={null} />);
  const progress = screen.getByRole('progressbar', {
    name: 'Progresso da rodada demonstrativa',
  });
  expect(progress).toHaveAttribute('aria-valuenow', '4');
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));
  expect(progress).toHaveAttribute('aria-valuenow', '5');
  fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect(progress).toHaveAttribute('aria-valuenow', '4');
});
it('valida o nome e anuncia o resultado local do formulário', () => {
  render(<DesignSystem apiStatus={null} />);
  const input = screen.getByRole('textbox', { name: 'Seu nome' });
  fireEvent.click(screen.getByRole('button', { name: 'Testar campo de nome' }));
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(
    screen.getByText('Conte como podemos chamar você.'),
  ).toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'Sandro' } });
  fireEvent.click(screen.getByRole('button', { name: 'Testar campo de nome' }));
  expect(input).not.toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('status')).toHaveTextContent('Tudo certo, Sandro!');
});
