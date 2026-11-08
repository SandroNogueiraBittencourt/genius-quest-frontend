import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';
import type { Theme, ThemeRank, ThemeVote, VotingCycle } from './types';

function checkSession(
  previous: ReturnType<typeof useAuthStore.getState>['session'],
  signal?: AbortSignal,
) {
  if (signal?.aborted || previous !== useAuthStore.getState().session)
    throw new DOMException('Solicitação encerrada.', 'AbortError');
}

function validTheme(value: unknown): value is Theme {
  if (!value || typeof value !== 'object') return false;
  const theme = value as Record<string, unknown>;
  return (
    typeof theme.id === 'string' &&
    typeof theme.categoriaId === 'string' &&
    typeof theme.autorId === 'string' &&
    typeof theme.titulo === 'string' &&
    theme.titulo.trim().length > 0 &&
    (typeof theme.descricao === 'string' || theme.descricao === null) &&
    ['PENDENTE', 'APROVADO', 'SUSPENSO', 'REMOVIDO'].includes(
      String(theme.status),
    ) &&
    typeof theme.criadoEm === 'string' &&
    typeof theme.atualizadoEm === 'string'
  );
}

function validCycle(value: unknown): value is VotingCycle {
  if (!value || typeof value !== 'object') return false;
  const cycle = value as Record<string, unknown>;
  return (
    typeof cycle.id === 'string' &&
    typeof cycle.nome === 'string' &&
    typeof cycle.inicioEm === 'string' &&
    typeof cycle.fimEm === 'string' &&
    ['ABERTO', 'ENCERRADO'].includes(String(cycle.status))
  );
}

function validRank(value: unknown): value is ThemeRank {
  if (!value || typeof value !== 'object') return false;
  const rank = value as Record<string, unknown>;
  return (
    typeof rank.temaId === 'string' &&
    typeof rank.titulo === 'string' &&
    typeof rank.posicao === 'number' &&
    typeof rank.votos === 'number' &&
    typeof rank.votantesDistintos === 'number'
  );
}

async function withSession<T>(
  path: string,
  options: Parameters<typeof authenticatedRequest>[1] = {},
): Promise<T> {
  const session = useAuthStore.getState().session;
  const data = await authenticatedRequest<T>(path, options);
  checkSession(session, options.signal);
  return data;
}

export async function getThemes(signal?: AbortSignal): Promise<Theme[]> {
  const data = await withSession<unknown>('/temas', { signal });
  if (!Array.isArray(data) || !data.every(validTheme))
    throw new ApiError(502, 'A API retornou temas inválidos.');
  return data;
}

export async function getManagedThemes(signal?: AbortSignal): Promise<Theme[]> {
  const data = await withSession<unknown>('/temas/moderacao', { signal });
  if (!Array.isArray(data) || !data.every(validTheme))
    throw new ApiError(502, 'A API retornou temas inválidos.');
  return data;
}

export async function suggestTheme(
  input: { categoriaId: string; titulo: string; descricao: string },
  signal?: AbortSignal,
): Promise<Theme> {
  const data = await withSession<unknown>('/temas', {
    method: 'POST',
    signal,
    json: {
      categoriaId: input.categoriaId,
      titulo: input.titulo.trim(),
      descricao: input.descricao.trim() || null,
    },
  });
  if (!validTheme(data))
    throw new ApiError(502, 'Não foi possível confirmar a sugestão enviada.');
  return data;
}

export async function moderateTheme(
  id: string,
  action: 'aprovar' | 'suspender' | 'remover',
): Promise<Theme> {
  const data = await withSession<unknown>(
    '/temas/' + encodeURIComponent(id) + '/' + action,
    { method: 'PATCH' },
  );
  if (!validTheme(data))
    throw new ApiError(502, 'Não foi possível confirmar a moderação.');
  return data;
}

export async function getCurrentCycle(
  signal?: AbortSignal,
): Promise<VotingCycle | null> {
  try {
    const data = await withSession<unknown>('/ciclos-votacao/atual', {
      signal,
    });
    if (!validCycle(data))
      throw new ApiError(502, 'A API retornou um ciclo inválido.');
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCycleRanking(
  cycleId: string,
  signal?: AbortSignal,
): Promise<ThemeRank[]> {
  const data = await withSession<unknown>(
    '/ciclos-votacao/' + encodeURIComponent(cycleId) + '/ranking',
    { signal },
  );
  if (!Array.isArray(data) || !data.every(validRank))
    throw new ApiError(502, 'A API retornou um ranking inválido.');
  return data;
}

export async function voteTheme(id: string): Promise<ThemeVote> {
  const data = await withSession<ThemeVote>(
    '/temas/' + encodeURIComponent(id) + '/votos',
    { method: 'POST' },
  );
  if (!data || typeof data.id !== 'string' || typeof data.cicloId !== 'string')
    throw new ApiError(502, 'Não foi possível confirmar o voto.');
  return data;
}

export async function createCycle(
  name: string,
  minutes: number,
): Promise<VotingCycle> {
  const now = Date.now();
  const data = await withSession<unknown>('/ciclos-votacao', {
    method: 'POST',
    json: {
      nome: name.trim(),
      inicioEm: new Date(now - 60_000).toISOString(),
      fimEm: new Date(now + minutes * 60_000).toISOString(),
    },
  });
  if (!validCycle(data))
    throw new ApiError(502, 'Não foi possível confirmar o novo ciclo.');
  return data;
}

export async function closeCycle(id: string): Promise<VotingCycle> {
  const data = await withSession<unknown>(
    '/ciclos-votacao/' + encodeURIComponent(id) + '/encerrar',
    { method: 'PATCH' },
  );
  if (!validCycle(data))
    throw new ApiError(502, 'Não foi possível confirmar o encerramento.');
  return data;
}
