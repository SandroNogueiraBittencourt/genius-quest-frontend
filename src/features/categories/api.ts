import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';
import type { Category, CategorySuggestion } from './types';

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
