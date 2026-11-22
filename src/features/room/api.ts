import { ApiError } from '../../services/http';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { useAuthStore } from '../auth/store';
import type { PreparedMatch } from '../quiz/api';

export type OnlineRoom = {
  codigo: string;
  partidaId: string | null;
  temaId: string | null;
  anfitriaoId: string;
  encerrada?: boolean;
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

export type RoomQuestion = {
  partidaId: string;
  numero: number;
  totalPerguntas: number;
  enunciado: string;
  alternativas: string[];
};

type RoomAnswer = {
  perguntaRespondida: number;
  status: OnlineRoom['status'];
  perguntaAtual: number | null;
};

function matchPath(code: string) {
  return `/salas/${encodeURIComponent(code)}/partida`;
}

export function startRoomMatch(code: string) {
  return requestRoom<RoomQuestion>(`${matchPath(code)}/iniciar`, {
    method: 'POST',
  });
}

export function getRoomQuestion(code: string, signal: AbortSignal) {
  return requestRoom<RoomQuestion>(`${matchPath(code)}/pergunta-atual`, {
    signal,
  });
}

export function answerRoomQuestion(
  code: string,
  numero: number,
  alternativaIndice: number,
) {
  return requestRoom<RoomAnswer>(`${matchPath(code)}/respostas`, {
    method: 'POST',
    json: { numero, alternativaIndice },
  });
}

type RoomContinuationState = {
  status: 'AGUARDANDO' | 'APROVADA' | 'ENCERRADA';
  meuVoto: boolean | null;
  favoraveis: number;
  contrarios: number;
  totalJogadores: number;
};

function continuationPath(codigo: string, partidaId: string) {
  return `/salas/${encodeURIComponent(codigo)}/partidas/${encodeURIComponent(partidaId)}/continuacao`;
}

export function getRoomContinuation(
  codigo: string,
  partidaId: string,
  signal: AbortSignal,
) {
  return requestRoom<RoomContinuationState>(
    continuationPath(codigo, partidaId),
    { signal },
  );
}

export function voteRoomContinuation(
  codigo: string,
  partidaId: string,
  continuar: boolean,
) {
  return requestRoom<RoomContinuationState>(
    continuationPath(codigo, partidaId),
    {
      method: 'PUT',
      json: { continuar },
    },
  );
}

export function leaveRoom(code: string) {
  return requestRoom<void>(`/salas/${encodeURIComponent(code)}/entrada`, {
    method: 'DELETE',
  });
}

export function closeRoom(code: string) {
  return requestRoom<void>(`/salas/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
}
