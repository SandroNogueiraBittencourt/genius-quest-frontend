import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';

export type PreparedMatch = {
  id: string;
  cicloId: string;
  cicloNome: string;
  temaId: string;
  temaTitulo: string;
  categoriaNome: string;
  status: 'PREPARACAO' | 'PRONTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  criadoEm: string;
};

function validMatch(data: unknown): data is PreparedMatch {
  if (!data || typeof data !== 'object') return false;
  const match = data as Record<string, unknown>;
  return (
    typeof match.id === 'string' &&
    typeof match.cicloId === 'string' &&
    typeof match.cicloNome === 'string' &&
    typeof match.temaId === 'string' &&
    typeof match.temaTitulo === 'string' &&
    typeof match.categoriaNome === 'string' &&
    typeof match.criadoEm === 'string' &&
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
  if (!validMatch(data))
    throw new ApiError(502, 'A API retornou uma partida inválida.');
  return data;
}

export async function getMyMatches(
  signal?: AbortSignal,
): Promise<PreparedMatch[]> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<unknown>('/partidas/minhas', {
    signal,
  });
  assertSessionUnchanged(session, signal);
  if (!Array.isArray(data) || !data.every(validMatch))
    throw new ApiError(502, 'A API retornou partidas inválidas.');
  return data;
}
