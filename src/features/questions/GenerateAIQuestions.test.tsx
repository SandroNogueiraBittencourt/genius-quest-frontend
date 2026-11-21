import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { GenerateAIQuestions } from './GenerateAIQuestions';

const temaId = '550e8400-e29b-41d4-a716-446655440001';
const geradaId = '550e8400-e29b-41d4-a716-446655440002';
const chave = '550e8400-e29b-41d4-a716-446655440003';
const tema = {
  id: temaId,
  categoriaId: geradaId,
  autorId: geradaId,
  titulo: 'Animais Selvagens',
  descricao: null,
  status: 'APROVADO',
  criadoEm: '2026-11-21T12:00:00Z',
  atualizadoEm: '2026-11-21T12:00:00Z',
};
const status = {
  habilitada: true,
  maximoPorSolicitacao: 3,
  limiteRequisicoesDiarias: 4,
  requisicoesHoje: 0,
  limitePerguntasDiarias: 10,
  perguntasHoje: 0,
};
const json = (body: unknown, code = 200) =>
  new Response(JSON.stringify(body), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  });
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onGenerated = vi.fn();
  const onCancel = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <GenerateAIQuestions onGenerated={onGenerated} onCancel={onCancel} />
    </QueryClientProvider>,
  );
  return { client, onGenerated, onCancel };
}
beforeEach(() => {
  const token =
    'header.' + btoa(JSON.stringify({ perfil: 'ADMIN' })) + '.signature';
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, 'admin@example.test');
  vi.stubGlobal('crypto', { randomUUID: () => chave });
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('com flags desativadas exibe aviso e nunca envia POST', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(json({ ...status, habilitada: false }));
  vi.stubGlobal('fetch', fetch);
  const { client } = setup();
  expect(
    await screen.findByText(/geração por IA está desativada/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Solicitar geração' }),
  ).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
  client.clear();
});

it('exige confirmacao de custo e só gera ao clicar em solicitar', async () => {
  const fetch = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/geracao/status')) return Promise.resolve(json(status));
    if (url.endsWith('/temas/moderacao')) return Promise.resolve(json([tema]));
    return Promise.resolve(json({ status: 'PENDENTE', ids: [geradaId] }, 201));
  });
  vi.stubGlobal('fetch', fetch);
  const { client, onGenerated } = setup();
  expect(
    await screen.findByRole('option', { name: 'Animais Selvagens' }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);

  fireEvent.change(screen.getByLabelText('Tema aprovado'), {
    target: { value: temaId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar geração' }));
  expect(await screen.findByText(/Confira o tema/)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar geração' }));
  await waitFor(() => expect(onGenerated).toHaveBeenCalledWith([geradaId]));
  expect(fetch).toHaveBeenCalledWith(
    '/api/admin/perguntas/geracao',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ temaId, quantidade: 1 }),
      headers: expect.objectContaining({ 'Idempotency-Key': chave }),
    }),
  );
  client.clear();
});

it('na falha bloqueia nova submissao automatica e orienta verificar a fila', async () => {
  const fetch = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/geracao/status')) return Promise.resolve(json(status));
    if (url.endsWith('/temas/moderacao')) return Promise.resolve(json([tema]));
    return Promise.resolve(json({ mensagem: 'Cota indisponível' }, 429));
  });
  vi.stubGlobal('fetch', fetch);
  const { client } = setup();
  await screen.findByRole('option', { name: 'Animais Selvagens' });
  fireEvent.change(screen.getByLabelText('Tema aprovado'), {
    target: { value: temaId },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar geração' }));
  expect(await screen.findByText(/Cota indisponível/)).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Solicitar geração' }),
  ).toBeDisabled();
  expect(
    screen.getByText(/Essa tentativa não será repetida automaticamente/),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(3);
  client.clear();
});
