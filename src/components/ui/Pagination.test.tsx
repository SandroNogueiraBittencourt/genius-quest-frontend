import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

const label = 'Paginação de teste';
it.each([0, 1])('oculta a navegação com %i página', (totalPages) => {
  render(
    <Pagination
      label={label}
      page={0}
      totalPages={totalPages}
      onPageChange={vi.fn()}
      busy={false}
    />,
  );
  expect(screen.queryByRole('navigation', { name: label })).toBeNull();
});

it.each([
  { page: 0, busy: false, anterior: true, proxima: false, destino: 1 },
  { page: 2, busy: false, anterior: false, proxima: true, destino: 1 },
  { page: 1, busy: true, anterior: true, proxima: true, destino: null },
])(
  'respeita os limites e operações em andamento na página $page',
  ({ page, busy, anterior, proxima, destino }) => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        label={label}
        page={page}
        totalPages={3}
        onPageChange={onPageChange}
        busy={busy}
      />,
    );
    const voltar = screen.getByRole('button', { name: 'Anterior' });
    const avancar = screen.getByRole('button', { name: 'Próxima' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Página ' + (page + 1) + ' de 3',
    );
    expect(voltar).toHaveProperty('disabled', anterior);
    expect(avancar).toHaveProperty('disabled', proxima);
    fireEvent.click(voltar);
    fireEvent.click(avancar);
    expect(onPageChange.mock.calls).toEqual(
      destino === null ? [] : [[destino]],
    );
  },
);
