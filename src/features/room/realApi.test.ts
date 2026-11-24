import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { authenticatedRequest } from '../auth/authenticatedRequest';
import { playerIdFromJwt, realRoomApi, validRoomCode } from './realApi';

vi.mock('../auth/authenticatedRequest', () => ({
  authenticatedRequest: vi.fn(),
}));

const request = vi.mocked(authenticatedRequest);
const code = 'ad8b73e1-e1f1-4e03-8d43-92c51c87bfa1';
const matchId = '11111111-0000-4000-8000-000000000001';
const rank = {
  id: '11111111-0000-4000-8000-000000000002',
  nome: 'Pessoa Teste',
  posicao: 1,
  pontos: 60,
  acertos: 4,
  erros: 6,
};
const resultado = { partidaId: matchId, classificacao: [rank] };
const sala = {
  codigo: code,
  partidaId: null,
  anfitriaoId: code,
  temaId: null,
  status: 'PREPARACAO',
  encerrada: false,
  participantes: [{ id: code, nome: 'Pessoa Teste' }],
};

beforeEach(() => {
  request.mockReset();
  useAuthStore.setState({
    session: {
      token: 'token-teste',
      email: 'teste@geniusquest.test',
      expiresAt: Date.now() + 60_000,
    },
  });
});

describe('cliente de salas multiplayer reais', () => {
  it('não aceita código demonstrativo como UUID', () => {
    expect(() => validRoomCode('GQ2026')).toThrow('código completo');
    expect(validRoomCode(code.toUpperCase())).toBe(code);
    expect(request).not.toHaveBeenCalled();
  });
  it('cria sala e confirma formato sem usar demoGateway', async () => {
    request.mockResolvedValueOnce(sala);
    await expect(realRoomApi.criar()).resolves.toEqual(sala);
    expect(request).toHaveBeenCalledWith('/salas', { method: 'POST' });
  });
  it('consulta sala pelo código UUID e permite entrada com login', async () => {
    request.mockResolvedValue(sala);
    await realRoomApi.entrar(code);
    await realRoomApi.consultar(code);
    expect(request).toHaveBeenNthCalledWith(1, '/salas/' + code + '/entrada', {
      method: 'POST',
    });
    expect(request).toHaveBeenNthCalledWith(2, '/salas/' + code, {
      signal: undefined,
    });
  });
  it('não confirma sessão trocada durante a resposta', async () => {
    request.mockImplementationOnce(async () => {
      useAuthStore.setState({ session: null });
      return sala;
    });
    await expect(realRoomApi.criar()).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
  it('vota e responde somente pelas rotas autenticadas', async () => {
    request
      .mockResolvedValueOnce({ aberta: true, meuVoto: code, totais: [] })
      .mockResolvedValueOnce({
        perguntaRespondida: 1,
        status: 'EM_ANDAMENTO',
        perguntaAtual: 2,
      });
    await realRoomApi.votar(code, code);
    await realRoomApi.responder(code, 1, 2);
    expect(request).toHaveBeenNthCalledWith(
      1,
      '/salas/' + code + '/votacao/voto',
      {
        method: 'PUT',
        json: { temaId: code },
      },
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/salas/' + code + '/partida/respostas',
      {
        method: 'POST',
        json: { numero: 1, alternativaIndice: 2 },
      },
    );
  });
  it('recusa payload incompleto de sala', async () => {
    request.mockResolvedValueOnce({ codigo: code });
    await expect(realRoomApi.criar()).rejects.toMatchObject({ status: 502 });
  });
  it('trata JWT como indicação visual, sem usá-lo para autorizar', () => {
    expect(playerIdFromJwt('invalido')).toBeNull();
  });
  it('consulta o placar da partida identificada, sem depender da rodada atual', async () => {
    const signal = new AbortController().signal;
    request.mockResolvedValueOnce(resultado);
    await expect(
      realRoomApi.consultarResultado(code.toUpperCase(), matchId, signal),
    ).resolves.toEqual(resultado);
    expect(request).toHaveBeenCalledWith(
      '/salas/' + code + '/partidas/' + matchId + '/resultado',
      { signal },
    );
  });
  it('recusa código demonstrativo e identificador de partida inválido', async () => {
    await expect(
      realRoomApi.consultarResultado('GQ2026', matchId),
    ).rejects.toThrow('código completo');
    await expect(
      realRoomApi.consultarResultado(code, 'invalido'),
    ).rejects.toThrow('Identificador da partida inválido');
    expect(request).not.toHaveBeenCalled();
  });
  it.each([
    { partidaId: code, classificacao: [rank] },
    { partidaId: matchId, classificacao: null },
    { partidaId: matchId, classificacao: [null] },
    { partidaId: matchId, classificacao: [rank, rank] },
    { partidaId: matchId, classificacao: [{ ...rank, pontos: -1 }] },
    { partidaId: matchId, classificacao: [{ ...rank, posicao: 0 }] },
    { partidaId: matchId, classificacao: [{ ...rank, acertos: 1.5 }] },
  ])('recusa placar inválido %#', async (invalid) => {
    request.mockResolvedValueOnce(invalid);
    await expect(
      realRoomApi.consultarResultado(code, matchId),
    ).rejects.toMatchObject({
      status: 502,
    });
  });
  it('respeita posições empatadas informadas pela API', async () => {
    const empate = {
      partidaId: matchId,
      classificacao: [rank, { ...rank, id: code, nome: 'Outra Pessoa' }],
    };
    request.mockResolvedValueOnce(empate);
    await expect(
      realRoomApi.consultarResultado(code, matchId),
    ).resolves.toEqual(empate);
  });
  it('descarta placar após cancelamento de consulta', async () => {
    const controller = new AbortController();
    request.mockImplementationOnce(async () => {
      controller.abort();
      return resultado;
    });
    await expect(
      realRoomApi.consultarResultado(code, matchId, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('descarta placar de sessão anterior', async () => {
    request.mockImplementationOnce(async () => {
      useAuthStore.setState({ session: null });
      return resultado;
    });
    await expect(
      realRoomApi.consultarResultado(code, matchId),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
