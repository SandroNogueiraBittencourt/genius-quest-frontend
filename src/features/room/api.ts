import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';
import type { PreparedMatch } from '../quiz/api';

export type OnlineRoom = {
  codigo: string;
  partidaId: string | null;
  temaId: string | null;
  anfitriaoId: string;
  status: PreparedMatch['status'];
  participantes: { id: string; nome: string }[];
};

async function requestRoom<T = OnlineRoom>(
  path: string,
  options: Parameters<typeof authenticatedRequest>[1],
) {
  const session = useAuthStore.getState().session;
  const room = await authenticatedRequest<T>(path, options);
  if (options?.signal?.aborted || session !== useAuthStore.getState().session) {
    throw new DOMException('Solicitação encerrada.', 'AbortError');
  }
  return room;
}

export function createRoom() {
  return requestRoom('/salas', { method: 'POST' });
}

export function joinRoom(code: string) {
  const codigo = code.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(codigo)) {
    throw new ApiError(400, 'Informe o código completo da sala.');
  }
  return requestRoom(`/salas/${encodeURIComponent(codigo)}/entrada`, {
    method: 'POST',
  });
}

export function getRoom(code: string, signal: AbortSignal) {
  return requestRoom(`/salas/${encodeURIComponent(code)}`, { signal });
}

type RoomVoting = {
  aberta: boolean;
  meuVoto: string | null;
  totais: { temaId: string; votos: number }[];
};

function votingPath(code: string) {
  return `/salas/${encodeURIComponent(code)}/votacao`;
}
export function getRoomVoting(code: string, signal: AbortSignal) {
  return requestRoom<RoomVoting>(votingPath(code), { signal });
}
export function openRoomVoting(code: string) {
  return requestRoom<RoomVoting>(votingPath(code), { method: 'POST' });
}
export function setRoomVote(code: string, temaId: string | null) {
  return requestRoom<RoomVoting>(
    `${votingPath(code)}/voto`,
    temaId ? { method: 'PUT', json: { temaId } } : { method: 'DELETE' },
  );
}
export function closeRoomVoting(code: string, desempate?: string) {
  const query = desempate ? `?desempate=${encodeURIComponent(desempate)}` : '';
  return requestRoom(`${votingPath(code)}/encerrar${query}`, {
    method: 'POST',
  });
}
