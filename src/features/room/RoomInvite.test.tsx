import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RoomInvite } from './RoomInvite';

const code = '33333333-0000-4000-8000-000000000001';
afterEach(() => vi.restoreAllMocks());

it('exibe QR Code e link acessível para a mesma sala', () => {
  render(<RoomInvite code={code} />);
  expect(
    screen.getByTitle('QR Code do convite para a sala'),
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Link de convite' })).toHaveValue(
    `${window.location.origin}/?view=real-room&room=${code}`,
  );
});
it('oferece cópia manual se o navegador não disponibiliza clipboard', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('negado'));
  const old = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  try {
    render(<RoomInvite code={code} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByText(/Selecione o link/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/?view=real-room&room=${code}`,
    );
  } finally {
    if (old) Object.defineProperty(navigator, 'clipboard', old);
    else Reflect.deleteProperty(navigator, 'clipboard');
  }
});
