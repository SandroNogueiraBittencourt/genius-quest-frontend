import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Avatar } from './Avatar';

it.each([
  ['  Ana   Clara Ribeiro ', 'AC'],
  ['Érica', 'É'],
  ['   ', '?'],
])('mostra as iniciais esperadas para %j', (name, initials) => {
  render(<Avatar name={name} />);
  expect(screen.getByText(initials)).toHaveAttribute('aria-hidden', 'true');
});

it.each([2, -2, 5])(
  'usa uma variante de cor válida para o índice %i',
  (index) => {
    render(<Avatar name="Lia" index={index} />);
    expect(screen.getByText('L')).toHaveClass('ui-avatar--2');
  },
);
