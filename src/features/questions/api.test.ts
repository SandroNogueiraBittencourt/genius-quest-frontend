import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import {
  decideQuestion,
  getManagedQuestion,
  getQuestionHistory,
  listManagedQuestions,
  reviewQuestion,
} from './api';

const id = '550e8400-e29b-41d4-a716-446655440000';
const themeId = '550e8400-e29b-41d4-a716-446655440001';
const question = {
  id,
  temaId: themeId,
  enunciado: 'Qual planeta é conhecido como planeta vermelho?',
  alternativas: ['Terra', 'Marte', 'Vênus', 'Netuno'],
  respostaCorretaIndice: 1,
  status: 'PENDENTE',
  origem: 'IA',
  dificuldadeInicial: 'FACIL',
  fonteReferencia: null,
  modeloIa: 'modelo-teste',
  revisorId: null,
  motivoRevisao: null,
  revisadoEm: null,
  criadoEm: '2026-11-15T12:00:00Z',
};
const page = {
  content: [question],
  page: { size: 10, number: 0, totalElements: 1, totalPages: 1 },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  useAuthStore
    .getState()
    .start(
      { token: 'jwt-admin', tipo: 'Bearer', expiraEm: 3600 },
      'admin@example.test',
    );
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});

it('não faz chamada administrativa sem sessão', async () => {
  useAuthStore.getState().end(null);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(
    listManagedQuestions({ status: 'PENDENTE', page: 0 }),
  ).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});

it('consulta a lista paginada com filtros e JWT', async () => {
  const fetch = vi.fn().mockResolvedValue(json(page));
  vi.stubGlobal('fetch', fetch);
  expect(
    (
      await listManagedQuestions({
        status: 'PENDENTE',
        temaId: themeId,
        page: 0,
      })
    ).content[0].id,
  ).toBe(id);
  expect(fetch).toHaveBeenCalledWith(
    `/api/admin/perguntas?page=0&size=10&status=PENDENTE&temaId=${themeId}`,
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }),
    }),
  );
});

it('rejeita paginação inválida antes de chamar a API', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(
    listManagedQuestions({ status: 'PENDENTE', page: -1 }),
  ).rejects.toThrow();
  await expect(
    listManagedQuestions({ status: 'PENDENTE', page: 0, size: 101 }),
  ).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it('não aceita lista com gabarito ou metadados malformados', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        json({ ...page, content: [{ ...question, respostaCorretaIndice: 4 }] }),
      ),
  );
  await expect(
    listManagedQuestions({ status: 'PENDENTE', page: 0 }),
  ).rejects.toMatchObject({ status: 502 });
});

it('consulta detalhes e histórico, e valida o formato da resposta', async () => {
  const event = {
    id,
    revisorId: themeId,
    acao: 'REVISAR',
    statusAnterior: 'PENDENTE',
    statusNovo: 'PENDENTE',
    motivo: 'Fonte',
    antes: '{}',
    depois: '{}',
    criadoEm: '2026-11-15T12:00:00Z',
  };
  const fetch = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(json(url.endsWith('/historico') ? [event] : question)),
    );
  vi.stubGlobal('fetch', fetch);
  expect((await getManagedQuestion(id)).id).toBe(id);
  expect(await getQuestionHistory(id)).toHaveLength(1);
});

it('envia revisão e decisão por PATCH autenticado, sem revelar dados ao cliente público', async () => {
  const fetch = vi
    .fn()
    .mockImplementation(() => Promise.resolve(json(question)));
  vi.stubGlobal('fetch', fetch);
  const review = {
    enunciado: question.enunciado,
    alternativas: question.alternativas,
    respostaCorretaIndice: 1,
    dificuldadeInicial: 'FACIL' as const,
    fonteReferencia: null,
    motivo: 'Verificado',
  };
  await reviewQuestion(id, review);
  await decideQuestion(id, 'APROVAR', 'Conferido');
  expect(fetch).toHaveBeenCalledWith(
    `/api/admin/perguntas/${id}/revisar`,
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify(review),
    }),
  );
  expect(fetch).toHaveBeenCalledWith(
    `/api/admin/perguntas/${id}/decisao`,
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ acao: 'APROVAR', motivo: 'Conferido' }),
    }),
  );
});

it('propaga 403 sem invalidar a sessão e descarta resposta após troca de conta', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ erro: 'Acesso negado' }, 403)),
  );
  await expect(getManagedQuestion(id)).rejects.toMatchObject({ status: 403 });
  expect(useAuthStore.getState().session).not.toBeNull();
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    ),
  );
  const pending = getManagedQuestion(id);
  useAuthStore
    .getState()
    .start(
      { token: 'other', tipo: 'Bearer', expiraEm: 3600 },
      'outro@example.test',
    );
  resolve(json(question));
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
