import { authenticatedRequest } from '../auth/authenticatedRequest';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';

export type RealParticipant = { id: string; nome: string };
export type RealRoom = {
  codigo: string;
  partidaId: string | null;
  anfitriaoId: string;
  status: 'PREPARACAO' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  participantes: RealParticipant[];
  temaId: string | null;
  encerrada: boolean;
};
export type RealVote = {
  aberta: boolean;
  meuVoto: string | null;
  totais: { temaId: string; votos: number }[];
};
export type RealQuestion = {
  partidaId: string;
  numero: number;
  totalPerguntas: number;
  enunciado: string;
  alternativas: string[];
};
export type RealAnswer = {
  perguntaRespondida: number;
  status: RealRoom['status'];
  perguntaAtual: number | null;
};
export type RealContinuation = {
  status: 'AGUARDANDO' | 'APROVADA' | 'ENCERRADA';
  meuVoto: boolean | null;
  favoraveis: number;
  contrarios: number;
  totalJogadores: number;
};
export type RealRank = RealParticipant & {
  posicao: number;
  pontos: number;
  acertos: number;
  erros: number;
};
export type RealResult = {
  partidaId: string;
  classificacao: RealRank[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validRoomCode(value: string) {
  const code = value.trim().toLowerCase();
  if (!UUID.test(code))
    throw new Error('Use o código completo da sala (UUID).');
  return code;
}
function roomPath(code: string) {
  return '/salas/' + encodeURIComponent(validRoomCode(code));
}
function checkSession(
  session: ReturnType<typeof useAuthStore.getState>['session'],
  signal?: AbortSignal,
) {
  if (signal?.aborted || session !== useAuthStore.getState().session)
    throw new DOMException('Solicitação encerrada.', 'AbortError');
}
function ensureRoom(value: unknown): RealRoom {
  if (!value || typeof value !== 'object')
    throw new ApiError(502, 'A API retornou uma sala inválida.');
  const room = value as Record<string, unknown>;
  if (
    typeof room.codigo !== 'string' ||
    !UUID.test(room.codigo) ||
    typeof room.anfitriaoId !== 'string' ||
    !Array.isArray(room.participantes) ||
    !room.participantes.every(
      (p: unknown) =>
        Boolean(p) &&
        typeof p === 'object' &&
        typeof (p as RealParticipant).id === 'string' &&
        typeof (p as RealParticipant).nome === 'string',
    ) ||
    !['PREPARACAO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'].includes(
      String(room.status),
    ) ||
    typeof room.encerrada !== 'boolean' ||
    (room.partidaId !== null && typeof room.partidaId !== 'string') ||
    (room.temaId !== null && typeof room.temaId !== 'string')
  )
    throw new ApiError(502, 'A API retornou uma sala inválida.');
  return value as RealRoom;
}
function nonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function validRank(value: unknown): value is RealRank {
  if (!value || typeof value !== 'object') return false;
  const player = value as Record<string, unknown>;
  return (
    typeof player.id === 'string' &&
    UUID.test(player.id) &&
    typeof player.nome === 'string' &&
    player.nome.trim().length > 0 &&
    nonNegativeInteger(player.posicao) &&
    player.posicao > 0 &&
    nonNegativeInteger(player.pontos) &&
    nonNegativeInteger(player.acertos) &&
    nonNegativeInteger(player.erros)
  );
}
function ensureResult(value: unknown, partidaId: string): RealResult {
  if (!value || typeof value !== 'object')
    throw new ApiError(502, 'A API retornou um placar inválido.');
  const result = value as Record<string, unknown>;
  if (
    typeof result.partidaId !== 'string' ||
    result.partidaId.toLowerCase() !== partidaId ||
    !Array.isArray(result.classificacao) ||
    !result.classificacao.every(validRank) ||
    new Set(result.classificacao.map((p: RealRank) => p.id.toLowerCase()))
      .size !== result.classificacao.length
  )
    throw new ApiError(502, 'A API retornou um placar inválido.');
  return {
    partidaId,
    classificacao: result.classificacao.map(
      ({ id, nome, posicao, pontos, acertos, erros }: RealRank) => ({
        id,
        nome,
        posicao,
        pontos,
        acertos,
        erros,
      }),
    ),
  };
}
async function request<T>(
  path: string,
  options: Parameters<typeof authenticatedRequest>[1] = {},
) {
  const session = useAuthStore.getState().session;
  const response = await authenticatedRequest<T>(path, options);
  checkSession(session, options.signal);
  return response;
}

export { userIdFromJwt as playerIdFromJwt } from '../auth/userIdFromJwt';

export const realRoomApi = {
  async criar(): Promise<RealRoom> {
    return ensureRoom(await request<unknown>('/salas', { method: 'POST' }));
  },
  async entrar(code: string): Promise<RealRoom> {
    return ensureRoom(
      await request<unknown>(roomPath(code) + '/entrada', { method: 'POST' }),
    );
  },
  async consultar(code: string, signal?: AbortSignal): Promise<RealRoom> {
    return ensureRoom(await request<unknown>(roomPath(code), { signal }));
  },
  async sair(code: string) {
    await request<void>(roomPath(code) + '/entrada', { method: 'DELETE' });
  },
  async fechar(code: string) {
    await request<void>(roomPath(code), { method: 'DELETE' });
  },
  async escolherTema(code: string, temaId: string): Promise<RealRoom> {
    return ensureRoom(
      await request<unknown>(roomPath(code) + '/tema', {
        method: 'PUT',
        json: { temaId },
      }),
    );
  },
  consultarVotacao(code: string, signal?: AbortSignal) {
    return request<RealVote>(roomPath(code) + '/votacao', { signal });
  },
  abrirVotacao(code: string) {
    return request<RealVote>(roomPath(code) + '/votacao', { method: 'POST' });
  },
  votar(code: string, temaId: string) {
    return request<RealVote>(roomPath(code) + '/votacao/voto', {
      method: 'PUT',
      json: { temaId },
    });
  },
  encerrarVotacao(code: string, desempate?: string): Promise<RealRoom> {
    const q = desempate ? '?desempate=' + encodeURIComponent(desempate) : '';
    return request<unknown>(roomPath(code) + '/votacao/encerrar' + q, {
      method: 'POST',
    }).then(ensureRoom);
  },
  iniciar(code: string) {
    return request<RealQuestion>(roomPath(code) + '/partida/iniciar', {
      method: 'POST',
    });
  },
  perguntaAtual(code: string, signal?: AbortSignal) {
    return request<RealQuestion>(roomPath(code) + '/partida/pergunta-atual', {
      signal,
    });
  },
  responder(code: string, numero: number, alternativaIndice: number) {
    return request<RealAnswer>(roomPath(code) + '/partida/respostas', {
      method: 'POST',
      json: { numero, alternativaIndice },
    });
  },
  async consultarResultado(
    code: string,
    partidaId: string,
    signal?: AbortSignal,
  ): Promise<RealResult> {
    const id = partidaId.toLowerCase();
    if (!UUID.test(id)) throw new Error('Identificador da partida inválido.');
    const result = await request<unknown>(
      roomPath(code) + '/partidas/' + encodeURIComponent(id) + '/resultado',
      { signal },
    );
    return ensureResult(result, id);
  },
  consultarContinuacao(code: string, partidaId: string, signal?: AbortSignal) {
    return request<RealContinuation>(
      roomPath(code) +
        '/partidas/' +
        encodeURIComponent(partidaId) +
        '/continuacao',
      { signal },
    );
  },
  votarContinuacao(code: string, partidaId: string, continuar: boolean) {
    return request<RealContinuation>(
      roomPath(code) +
        '/partidas/' +
        encodeURIComponent(partidaId) +
        '/continuacao',
      { method: 'PUT', json: { continuar } },
    );
  },
};
