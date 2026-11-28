import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiHealth } from './ApiHealth';

afterEach(() => vi.unstubAllGlobals());

it('mostra a consulta em andamento e depois identifica o backend conectado', async () => {
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          status: 'UP',
          application: 'Genius Quest',
          timestamp: '2026-11-28T12:00:00Z',
        }),
      ),
  );
  vi.stubGlobal('fetch', fetch);
  render(<ApiHealth />);
  const status = screen.getByRole('status', { name: 'Conexão com a API' });
  expect(status).toHaveTextContent('Consultando o backend...');
  expect(await screen.findByText('Genius Quest conectado')).toBeInTheDocument();
  expect(status).toHaveAttribute('aria-live', 'polite');
  expect(status).toHaveClass('ds-api--online');
  expect(fetch).toHaveBeenCalledWith('/api/health', {
    headers: { Accept: 'application/json' },
  });
});

it.each([401, 503])(
  'apresenta mensagem de indisponibilidade para HTTP %i',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status })),
    );
    render(<ApiHealth />);
    expect(
      await screen.findByText('Backend indisponível no momento'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('ds-api--offline');
  },
);
