import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';
import type {
  AIQuestionGenerationInput,
  AIQuestionGenerationStatus,
  ManagedQuestion,
  ManagedQuestionPage,
  ManualQuestionInput,
  QuestionDecision,
  QuestionHistory,
  QuestionReview,
  QuestionStatus,
} from './types';

const statusValues = ['PENDENTE', 'APROVADA', 'REJEITADA', 'BLOQUEADA'];
const difficultyValues = ['FACIL', 'MEDIA', 'DIFICIL'];
const actionValues = ['APROVAR', 'REJEITAR', 'BLOQUEAR'];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isManagedQuestion(value: unknown): value is ManagedQuestion {
  if (!record(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.temaId === 'string' &&
    typeof value.enunciado === 'string' &&
    Array.isArray(value.alternativas) &&
    value.alternativas.length === 4 &&
    value.alternativas.every((option) => typeof option === 'string') &&
    Number.isInteger(value.respostaCorretaIndice) &&
    Number(value.respostaCorretaIndice) >= 0 &&
    Number(value.respostaCorretaIndice) <= 3 &&
    statusValues.includes(String(value.status)) &&
    ['IA', 'MANUAL'].includes(String(value.origem)) &&
    difficultyValues.includes(String(value.dificuldadeInicial)) &&
    nullableString(value.fonteReferencia) &&
    nullableString(value.modeloIa) &&
    nullableString(value.revisorId) &&
    nullableString(value.motivoRevisao) &&
    nullableString(value.revisadoEm) &&
    typeof value.criadoEm === 'string'
  );
}

function isHistory(value: unknown): value is QuestionHistory {
  if (!record(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.revisorId === 'string' &&
    ['REVISAR', ...actionValues].includes(String(value.acao)) &&
    statusValues.includes(String(value.statusAnterior)) &&
    statusValues.includes(String(value.statusNovo)) &&
    nullableString(value.motivo) &&
    nullableString(value.antes) &&
    nullableString(value.depois) &&
    typeof value.criadoEm === 'string'
  );
}

function unchangedSession(
  previous: ReturnType<typeof useAuthStore.getState>['session'],
  signal?: AbortSignal,
) {
  if (signal?.aborted || previous !== useAuthStore.getState().session)
    throw new DOMException('Solicitação encerrada.', 'AbortError');
}

function questionPath(id: string) {
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id))
    throw new Error('Identificador da pergunta inválido.');
  return `/admin/perguntas/${encodeURIComponent(id)}`;
}

export async function listManagedQuestions(
  filters: {
    status: QuestionStatus | 'TODAS';
    temaId?: string;
    page: number;
    size?: number;
  },
  signal?: AbortSignal,
): Promise<ManagedQuestionPage> {
  const { status, temaId, page, size = 10 } = filters;
  if (
    !Number.isInteger(page) ||
    page < 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100 ||
    (status !== 'TODAS' && !statusValues.includes(status))
  )
    throw new Error('Filtros de perguntas inválidos.');
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (status !== 'TODAS') params.set('status', status);
  if (temaId?.trim()) params.set('temaId', temaId.trim());

  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(
    `/admin/perguntas?${params}`,
    { signal },
  );
  unchangedSession(previous, signal);
  if (
    !record(data) ||
    !Array.isArray(data.content) ||
    !data.content.every(isManagedQuestion) ||
    !record(data.page)
  )
    throw new ApiError(502, 'A API retornou uma lista de perguntas inválida.');
  const meta = data.page;
  if (
    meta.number !== page ||
    meta.size !== size ||
    !Number.isInteger(meta.totalElements) ||
    Number(meta.totalElements) < 0 ||
    !Number.isInteger(meta.totalPages) ||
    Number(meta.totalPages) < 0
  )
    throw new ApiError(502, 'Metadados de paginação inválidos.');
  return data as ManagedQuestionPage;
}

export async function getManagedQuestion(
  id: string,
  signal?: AbortSignal,
): Promise<ManagedQuestion> {
  const path = questionPath(id);
  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(path, { signal });
  unchangedSession(previous, signal);
  if (!isManagedQuestion(data) || data.id !== id)
    throw new ApiError(502, 'A API retornou uma pergunta inválida.');
  return data;
}

export async function getQuestionHistory(
  id: string,
  signal?: AbortSignal,
): Promise<QuestionHistory[]> {
  const path = questionPath(id);
  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(`${path}/historico`, {
    signal,
  });
  unchangedSession(previous, signal);
  if (!Array.isArray(data) || !data.every(isHistory))
    throw new ApiError(502, 'A API retornou um histórico inválido.');
  return data;
}

export async function reviewQuestion(
  id: string,
  request: QuestionReview,
  signal?: AbortSignal,
): Promise<ManagedQuestion> {
  const path = questionPath(id);
  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(`${path}/revisar`, {
    method: 'PATCH',
    json: request,
    signal,
  });
  unchangedSession(previous, signal);
  if (!isManagedQuestion(data) || data.id !== id)
    throw new ApiError(502, 'A API não confirmou a revisão da pergunta.');
  return data;
}

export async function decideQuestion(
  id: string,
  action: QuestionDecision,
  motivo: string,
  signal?: AbortSignal,
): Promise<ManagedQuestion> {
  const path = questionPath(id);
  if (!actionValues.includes(action)) throw new Error('Decisão inválida.');
  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(`${path}/decisao`, {
    method: 'PATCH',
    json: { acao: action, motivo: motivo.trim() },
    signal,
  });
  unchangedSession(previous, signal);
  if (!isManagedQuestion(data) || data.id !== id)
    throw new ApiError(502, 'A API não confirmou a decisão.');
  return data;
}

/** Cria uma candidata PENDENTE; a resposta retorna somente o identificador. */
export async function createManualQuestion(
  request: ManualQuestionInput,
  signal?: AbortSignal,
): Promise<string> {
  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>('/admin/perguntas', {
    method: 'POST',
    json: request,
    signal,
  });
  unchangedSession(previous, signal);
  if (
    !record(data) ||
    typeof data.id !== 'string' ||
    !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(data.id)
  )
    throw new ApiError(502, 'A API não confirmou o cadastro da pergunta.');
  return data.id;
}

/** Consulta quota e flags sem iniciar geração ou consumir tokens. */
export async function getAIQuestionGenerationStatus(
  signal?: AbortSignal,
): Promise<AIQuestionGenerationStatus> {
  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(
    '/admin/perguntas/geracao/status',
    { signal },
  );
  unchangedSession(previous, signal);
  if (
    !record(data) ||
    typeof data.habilitada !== 'boolean' ||
    ![
      'maximoPorSolicitacao',
      'limiteRequisicoesDiarias',
      'requisicoesHoje',
      'limitePerguntasDiarias',
      'perguntasHoje',
    ].every((key) => Number.isInteger(data[key]) && Number(data[key]) >= 0) ||
    Number(data.maximoPorSolicitacao) < 1 ||
    Number(data.requisicoesHoje) > Number(data.limiteRequisicoesDiarias) ||
    Number(data.perguntasHoje) > Number(data.limitePerguntasDiarias)
  )
    throw new ApiError(502, 'A API retornou limites de geração inválidos.');
  return data as AIQuestionGenerationStatus;
}

/** POST explícito, sem retry automático, com UUID de tentativa único. */
export async function generateAIQuestions(
  request: AIQuestionGenerationInput,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  if (
    !Number.isInteger(request.quantidade) ||
    request.quantidade < 1 ||
    request.quantidade > 3 ||
    !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
      request.temaId,
    )
  )
    throw new Error('Solicitação de geração inválida.');
  const previous = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>('/admin/perguntas/geracao', {
    method: 'POST',
    json: request,
    idempotencyKey,
    signal,
  });
  unchangedSession(previous, signal);
  if (
    !record(data) ||
    data.status !== 'PENDENTE' ||
    !Array.isArray(data.ids) ||
    data.ids.length !== request.quantidade ||
    !data.ids.every(
      (id) =>
        typeof id === 'string' &&
        /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id),
    )
  )
    throw new ApiError(
      502,
      'A API não confirmou a geração de candidatas pendentes.',
    );
  return data.ids as string[];
}
