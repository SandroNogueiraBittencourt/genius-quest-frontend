import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { CreateManualQuestion } from './CreateManualQuestion';

const themeId = '550e8400-e29b-41d4-a716-446655440001';
const questionId = '550e8400-e29b-41d4-a716-446655440002';
const themes = [
  {
    id: themeId,
    categoriaId: questionId,
    autorId: questionId,
    titulo: 'Astronomia',
    descricao: null,
    status: 'APROVADO',
    criadoEm: '2026-11-21T12:00:00Z',
    atualizadoEm: '2026-11-21T12:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    categoriaId: questionId,
    autorId: questionId,
    titulo: 'Tema pendente',
    descricao: null,
    status: 'PENDENTE',
    criadoEm: '2026-11-21T12:00:00Z',
    atualizadoEm: '2026-11-21T12:00:00Z',
  },
];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onCreated = vi.fn();
  const result = render(
    <QueryClientProvider client={client}>
      <CreateManualQuestion onCreated={onCreated} onCancel={vi.fn()} />
    </QueryClientProvider>,
  );
  return { ...result, client, onCreated };
}

beforeEach(() => {
  const token =
    'header.' + btoa(JSON.stringify({ perfil: 'ADMIN' })) + '.signature';
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, 'admin@example.test');
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('lista só temas aprovados e cadastra pergunta pendente por POST autenticado', async () => {
  const fetch = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/temas/moderacao')) return Promise.resolve(json(themes));
    return Promise.resolve(json({ id: questionId }, 201));
  });
  vi.stubGlobal('fetch', fetch);
  const { client, onCreated } = setup();
  expect(await screen.findByRole('option', { name: 'Astronomia' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Tema pendente' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Tema aprovado'), {
    target: { value: themeId },
  });
  fireEvent.change(screen.getByLabelText('Enunciado'), {
    target: { value: 'Qual planeta é conhecido como planeta vermelho?' },
  });
  for (const [index, text] of ['Terra', 'Marte', 'Vênus', 'Netuno'].entries()) {
    fireEvent.change(screen.getByLabelText(`Alternativa ${String.fromCharCode(65 + index)}`), {
      target: { value: text },
    });
  }
  fireEvent.change(screen.getByLabelText('Alternativa correta'), {
    target: { value: '1' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar como pendente' }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(questionId));
  expect(fetch).toHaveBeenCalledWith(
    '/api/admin/perguntas',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        temaId: themeId,
        enunciado: 'Qual planeta é conhecido como planeta vermelho?',
        alternativas: ['Terra', 'Marte', 'Vênus', 'Netuno'],
        respostaCorretaIndice: 1,
        dificuldadeInicial: 'MEDIA',
        fonteReferencia: null,
      }),
    }),
  );
  client.clear();
});

it('bloqueia alternativas duplicadas sem enviar POST', async () => {
  const fetch = vi.fn().mockResolvedValue(json(themes));
  vi.stubGlobal('fetch', fetch);
  const { client } = setup();
  await screen.findByRole('option', { name: 'Astronomia' });
  fireEvent.change(screen.getByLabelText('Tema aprovado'), {
    target: { value: themeId },
  });
  fireEvent.change(screen.getByLabelText('Enunciado'), {
    target: { value: 'Qual planeta é conhecido como planeta vermelho?' },
  });
  for (const letter of ['A', 'B', 'C', 'D']) {
    fireEvent.change(screen.getByLabelText(`Alternativa ${letter}`), {
      target: { value: 'Marte' },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar como pendente' }));
  expect(await screen.findByText(/quatro alternativas distintas/)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  client.clear();
});

it('não apresenta formulário quando não há temas aprovados', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(themes.slice(1))));
  const { client } = setup();
  expect(
    await screen.findByText('Não existem temas aprovados disponíveis para cadastrar perguntas.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cadastrar como pendente' })).toBeNull();
  client.clear();
});
