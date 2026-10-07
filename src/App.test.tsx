import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
afterEach(() => vi.unstubAllGlobals());
describe('estado acessível da consulta ao backend', () => {
  it('anuncia carregamento e depois o retorno da API', async () => {
    const body = {
      status: 'UP',
      application: 'Genius Quest Backend',
      timestamp: '2026-10-07T15:00:00Z',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body))),
    );
    render(<App />);
    expect(
      screen.getByRole('status', { name: 'Conexão com a API' }),
    ).toHaveTextContent('Consultando o backend');
    expect(
      screen.getByRole('status', { name: 'Conexão com a API' }),
    ).toHaveAttribute('aria-live', 'polite');
    await screen.findByText('Genius Quest Backend conectado');
    expect(
      screen.getByRole('status', { name: 'Conexão com a API' }),
    ).toHaveTextContent('conectado');
  });
  it('mantém a aplicação visível quando a API falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 503 })),
    );
    render(<App />);
    await screen.findByText('Backend indisponível no momento');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Conexão com a API' }),
    ).toHaveTextContent('indisponível');
  });
});
