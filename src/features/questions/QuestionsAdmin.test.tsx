import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { QuestionsAdmin } from './QuestionsAdmin';

const id = '550e8400-e29b-41d4-a716-446655440000';
const question = {
  id,
  temaId: '550e8400-e29b-41d4-a716-446655440001',
  enunciado: 'Qual planeta é conhecido como planeta vermelho?',
  alternativas: ['Terra', 'Marte', 'Vênus', 'Netuno'],
  respostaCorretaIndice: 1,
  status: 'PENDENTE',
  origem: 'IA',
  dificuldadeInicial: 'FACIL',
  fonteReferencia: null,
  modeloIa: 'teste',
  revisorId: null,
  motivoRevisao: null,
  revisadoEm: null,
  criadoEm: '2026-11-15T12:00:00Z',
};
const page = {
  content: [question],
  page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onSignIn = vi.fn();
  const result = render(
    <QueryClientProvider client={client}>
      <QuestionsAdmin onSignIn={onSignIn} />
    </QueryClientProvider>,
  );
  return { ...result, client, onSignIn };
}
function startAdmin() {
  const token =
    'header.' + btoa(JSON.stringify({ perfil: 'ADMIN' })) + '.signature';
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, 'admin@example.test');
}

beforeEach(() => startAdmin());
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('não consulta a API sem autenticação e oferece login', () => {
  useAuthStore.getState().end(null);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const { onSignIn, client } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar para moderar' }));
  expect(onSignIn).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
  client.clear();
});

it('esconde ações e gabarito para JWT sem claim ADMIN', () => {
  useAuthStore.getState().start(
    {
      token: 'header.' + btoa(JSON.stringify({ perfil: 'USUARIO' })) + '.sig',
      tipo: 'Bearer',
      expiraEm: 3600,
    },
    'user@example.test',
  );
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const { client } = setup();
  expect(
    screen.getByText('Acesso restrito a administradores.'),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  client.clear();
});

it('mostra erro 403 retornado pela API sem apresentar perguntas', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ erro: 'Acesso negado' }, 403)),
  );
  const { client } = setup();
  expect(
    await screen.findByText('Acesso restrito a administradores.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Revisar pergunta' })).toBeNull();
  client.clear();
});

it('exibe gabarito para ADMIN e exige confirmação antes de aprovar', async () => {
  const fetch = vi
    .fn()
    .mockImplementation((url: string, options: RequestInit) => {
      if (url.endsWith('/decisao'))
        return Promise.resolve(json({ ...question, status: 'APROVADA' }));
      if (url.includes('?')) return Promise.resolve(json(page));
      if (options.method === 'GET') return Promise.resolve(json(question));
      return Promise.resolve(json(question));
    });
  vi.stubGlobal('fetch', fetch);
  const { client } = setup();
  await screen.findByRole('button', { name: 'Revisar pergunta' });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar pergunta' }));
  expect(await screen.findByText('Marte (correta)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Aprovar$/ }));
  expect(fetch).not.toHaveBeenCalledWith(
    expect.stringContaining('/decisao'),
    expect.anything(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprovar' }));
  expect(
    await screen.findByText('Decisão registrada: Aprovar.'),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    `/api/admin/perguntas/${id}/decisao`,
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ acao: 'APROVAR', motivo: '' }),
    }),
  );
  client.clear();
});
