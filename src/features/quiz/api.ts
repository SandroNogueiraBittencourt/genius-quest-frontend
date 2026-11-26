import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';

export type PreparedMatch = {
  id: string;
  cicloId: string | null;
  cicloNome: string | null;
  temaId: string;
  temaTitulo: string;
  categoriaNome: string;
  status: 'PREPARACAO' | 'PRONTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  criadoEm: string;
  codigoSala?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validMatch(data: unknown): data is PreparedMatch {
  if (!data || typeof data !== 'object') return false;
  const match = data as Record<string, unknown>;
  return (
    typeof match.id === 'string' &&
    ((typeof match.cicloId === 'string' &&
      typeof match.cicloNome === 'string') ||
      (match.cicloId === null && match.cicloNome === null)) &&
    typeof match.temaId === 'string' &&
    typeof match.temaTitulo === 'string' &&
    typeof match.categoriaNome === 'string' &&
    typeof match.criadoEm === 'string' &&
    Number.isFinite(Date.parse(match.criadoEm)) &&
    ((match.cicloId !== null && match.codigoSala == null) ||
      (typeof match.codigoSala === 'string' &&
        UUID.test(match.codigoSala) &&
        UUID.test(match.id))) &&
    ['PREPARACAO', 'PRONTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'].includes(
      String(match.status),
    )
  );
}

function assertSessionUnchanged(
  session: ReturnType<typeof useAuthStore.getState>['session'],
  signal?: AbortSignal,
) {
  if (signal?.aborted || session !== useAuthStore.getState().session)
    throw new DOMException('Solicitação encerrada.', 'AbortError');
}

export async function prepareMatch(cicloId: string): Promise<PreparedMatch> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>('/partidas', {
    method: 'POST',
    json: { cicloId },
  });
  assertSessionUnchanged(session);
  if (!validMatch(data) || data.cicloId === null || data.codigoSala)
    throw new ApiError(502, 'A API retornou uma partida inválida.');
  return data;
}

export async function getMyMatches(
  signal?: AbortSignal,
): Promise<PreparedMatch[]> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>(
    '/partidas/minhas?incluirSalas=true',
    { signal },
  );
  assertSessionUnchanged(session, signal);
  if (!Array.isArray(data) || !data.every(validMatch))
    throw new ApiError(502, 'A API retornou partidas inválidas.');
  return data;
}

export const MATCH_PAGE_SIZE = 10;

export async function getMyMatchesPage(page: number, signal?: AbortSignal) {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<{
    content?: unknown;
    page?: { totalPages?: unknown };
  }>(
    `/partidas/minhas?incluirSalas=true&page=${page}&size=${MATCH_PAGE_SIZE}`,
    { signal },
  );
  assertSessionUnchanged(session, signal);
  const totalPages = data?.page?.totalPages;
  if (
    !Array.isArray(data?.content) ||
    !data.content.every(validMatch) ||
    typeof totalPages !== 'number' ||
    !Number.isSafeInteger(totalPages) ||
    totalPages < 0
  )
    throw new ApiError(502, 'A API retornou uma página de partidas inválida.');
  return { items: data.content as PreparedMatch[], totalPages };
}
