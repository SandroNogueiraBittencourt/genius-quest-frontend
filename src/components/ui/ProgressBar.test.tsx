import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

it.each([
  { value: 3, max: 4, current: 3, maximum: 4, width: '75%' },
  { value: -2, max: 5, current: 0, maximum: 5, width: '0%' },
  { value: 5, max: -1, current: 1, maximum: 1, width: '100%' },
  { value: Infinity, max: 5, current: 0, maximum: 5, width: '0%' },
  { value: 0.5, max: Infinity, current: 0.5, maximum: 1, width: '50%' },
])(
  'mantém barra visual e acessível consistentes para $value de $max',
  ({ value, max, current, maximum, width }) => {
    render(
      <ProgressBar label="Progresso da partida" value={value} max={max} />,
    );
    const bar = screen.getByRole('progressbar', {
      name: 'Progresso da partida',
    });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', String(maximum));
    expect(bar).toHaveAttribute('aria-valuenow', String(current));
    expect(bar.firstElementChild).toHaveStyle({ width });
  },
);
