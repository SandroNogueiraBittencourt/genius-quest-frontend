import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';
import type { Category, CategoryPage, CategorySuggestion } from './types';

function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.nome === 'string' &&
    item.nome.trim().length > 0 &&
    (item.descricao === null || typeof item.descricao === 'string') &&
    ['PENDENTE', 'APROVADA', 'REMOVIDA'].includes(String(item.status)) &&
    typeof item.criadoEm === 'string' &&
    typeof item.atualizadoEm === 'string'
  );
}

function checkSession(
  previous: ReturnType<typeof useAuthStore.getState>['session'],
  signal?: AbortSignal,
) {
  if (signal?.aborted || previous !== useAuthStore.getState().session)
    throw new DOMException('Solicitação encerrada.', 'AbortError');
}

export async function getApprovedCategories(
  signal?: AbortSignal,
): Promise<Category[]> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>('/categorias/aprovadas', {
    signal,
  });
  checkSession(session, signal);
  if (
    !Array.isArray(data) ||
    !data.every((item) => isCategory(item) && item.status === 'APROVADA')
  )
    throw new ApiError(
      502,
      'A API retornou uma lista de categorias inválida. Tente novamente.',
    );
  return data;
}

export async function getApprovedCategoriesPage(
  page: number,
  size = 10,
  signal?: AbortSignal,
): Promise<CategoryPage> {
  if (
    !Number.isInteger(page) ||
    page < 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  ) {
    throw new Error('Parâmetros de paginação inválidos.');
  }

  const session = useAuthStore.getState().session;

  const data = await authenticatedRequest<unknown>(
    `/categorias/aprovadas?page=${page}&size=${size}`,
    { signal },
  );

  checkSession(session, signal);

  if (typeof data !== 'object' || data === null) {
    throw new ApiError(502, 'Resposta de paginação inválida.');
  }

  const result = data as Record<string, unknown>;
  const metadata = result.page;

  if (
    !Array.isArray(result.content) ||
    !result.content.every(
      (item) => isCategory(item) && item.status === 'APROVADA',
    ) ||
    typeof metadata !== 'object' ||
    metadata === null
  ) {
    throw new ApiError(502, 'Resposta de paginação inválida.');
  }

  const info = metadata as Record<string, unknown>;

  if (
    !Number.isInteger(info.number) ||
    info.number !== page ||
    !Number.isInteger(info.size) ||
    info.size !== size ||
    !Number.isInteger(info.totalElements) ||
    !Number.isInteger(info.totalPages) ||
    Number(info.totalElements) < 0 ||
    Number(info.totalPages) < 0
  ) {
    throw new ApiError(502, 'Metadados de paginação inválidos.');
  }

  return data as CategoryPage;
}

export async function suggestCategory(
  input: CategorySuggestion,
  signal?: AbortSignal,
): Promise<Category> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>('/categorias', {
    method: 'POST',
    json: {
      nome: input.nome.trim(),
      descricao: input.descricao.trim() || null,
    },
    signal,
  });
  checkSession(session, signal);
  if (!isCategory(data))
    throw new ApiError(
      502,
      'Não foi possível confirmar os dados da categoria enviada.',
    );
  return data;
}

/** A moderação sempre depende da autorização do backend (ADMIN). */
export async function getManagedCategories(
  signal?: AbortSignal,
): Promise<Category[]> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>('/categorias', { signal });
  checkSession(session, signal);
  if (!Array.isArray(data) || !data.every(isCategory))
    throw new ApiError(502, 'A API retornou categorias inválidas.');
  return data;
}

export async function changeCategoryStatus(
  id: string,
  action: 'aprovar' | 'remover',
  signal?: AbortSignal,
): Promise<Category> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(
    '/categorias/' + encodeURIComponent(id) + '/' + action,
    { method: 'PATCH', signal },
  );
  checkSession(session, signal);
  if (!isCategory(data))
    throw new ApiError(502, 'Não foi possível confirmar a moderação.');
  return data;
}

export async function updateCategory(
  id: string,
  change: { nome: string; descricao: string },
  signal?: AbortSignal,
): Promise<Category> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(
    '/categorias/' + encodeURIComponent(id),
    {
      method: 'PATCH',
      json: {
        nome: change.nome.trim(),
        descricao: change.descricao.trim(),
      },
      signal,
    },
  );
  checkSession(session, signal);
  if (!isCategory(data))
    throw new ApiError(502, 'Não foi possível confirmar a atualização.');
  return data;
}
