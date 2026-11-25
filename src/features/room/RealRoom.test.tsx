import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/store';
import { RealRoom } from './RealRoom';
import type { RealContinuation, RealRoom as RoomState } from './realApi';
import { readRoomCode, rememberRoomCode } from './savedRoom';

const code = '33333333-0000-4000-8000-000000000001';
const firstMatch = '33333333-0000-4000-8000-000000000002';
const nextMatch = '33333333-0000-4000-8000-000000000003';
const playerId = '33333333-0000-4000-8000-000000000004';
const guestId = '33333333-0000-4000-8000-000000000005';
const roomPath = '/salas/' + code;
const baseRoom: RoomState = {
  codigo: code,
  partidaId: firstMatch,
  anfitriaoId: playerId,
  status: 'CONCLUIDA',
  participantes: [
    { id: playerId, nome: 'Anfitriã' },
    { id: guestId, nome: 'Convidado' },
  ],
  temaId: 'tema-01',
  encerrada: false,
};
const waiting: RealContinuation = {
  status: 'AGUARDANDO',
  meuVoto: null,
  favoraveis: 0,
  contrarios: 0,
  totalJogadores: 2,
};
const closed: RealContinuation = {
  ...waiting,
  status: 'ENCERRADA',
  contrarios: 1,
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function mockServer(initial: RoomState = baseRoom) {
  const server = {
    room: initial,
    continuation: waiting,
    voteFailure: null as RealContinuation | null,
    themeVote: {
      aberta: true,
      meuVoto: null as string | null,
      totais: [] as { temaId: string; votos: number }[],
    },
    onContinue: undefined as (() => void) | undefined,
  };
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/temas'))
      return json([
        {
          id: 'tema-01',
          categoriaId: 'categoria-01',
          autorId: playerId,
          titulo: 'Astronomia',
          descricao: null,
          status: 'APROVADO',
          criadoEm: '2026-11-24T12:00:00Z',
          atualizadoEm: '2026-11-24T12:00:00Z',
        },
      ]);
    if (url.endsWith(roomPath) || url.endsWith(roomPath + '/entrada'))
      return json(server.room);
    if (url.endsWith(roomPath + '/votacao')) return json(server.themeVote);
    if (url.endsWith(roomPath + '/partida/pergunta-atual'))
      return json({
        partidaId: server.room.partidaId,
        numero: 1,
        totalPerguntas: 10,
        enunciado:
          server.room.partidaId === nextMatch
            ? 'Pergunta da segunda rodada'
            : 'Pergunta da primeira rodada',
        alternativas: ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'],
      });
    if (url.endsWith(roomPath + '/partida/respostas'))
      return json({
        perguntaRespondida: 1,
        status: 'EM_ANDAMENTO',
        perguntaAtual: 1,
      });
    if (url.endsWith('/partidas/' + firstMatch + '/resultado'))
      return json({
        partidaId: firstMatch,
        classificacao: [
          {
            id: playerId,
            nome: 'Anfitriã',
            posicao: 1,
            pontos: 80,
            acertos: 6,
            erros: 4,
          },
          {
            id: guestId,
            nome: 'Convidado',
            posicao: 2,
            pontos: 30,
            acertos: 2,
            erros: 8,
          },
        ],
      });
    if (url.endsWith('/partidas/' + firstMatch + '/continuacao')) {
      if (init.method === 'PUT') {
        if (server.voteFailure) {
          server.continuation = server.voteFailure;
          return json(
            { mensagem: 'A votação de continuação foi encerrada' },
            409,
          );
        }
        server.onContinue?.();
        server.continuation = {
          ...waiting,
          meuVoto: true,
          favoraveis: 1,
        };
      }
      return json(server.continuation);
    }
    return json({}, 404);
  });
  vi.stubGlobal('fetch', fetch);
  return { server, fetch };
}
function mount(resume = true, jogador = playerId) {
  if (resume) rememberRoomCode(jogador, code);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onViewResults = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <RealRoom onSignIn={() => undefined} onViewResults={onViewResults} />
    </QueryClientProvider>,
  );
  return { onViewResults, client };
}

function autenticar(id: string) {
  const token =
    'header.' + btoa(JSON.stringify({ usuarioId: id })) + '.assinatura-teste';
  useAuthStore
    .getState()
    .start({ token, tipo: 'Bearer', expiraEm: 3600 }, 'jogador@gq.test');
}

beforeEach(() => {
  sessionStorage.clear();
  autenticar(playerId);
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

it('permite entrada com UUID completo sem consultar placar de partida não concluída', async () => {
  const { fetch } = mockServer({
    ...baseRoom,
    partidaId: null,
    temaId: null,
    status: 'PREPARACAO',
  });
  mount(false);
  const input = screen.getByRole('textbox', { name: 'Código completo (UUID)' });
  fireEvent.change(input, { target: { value: code } });
  expect(input).toHaveValue(code);
  fireEvent.click(screen.getByRole('button', { name: 'Entrar na sala' }));
  expect(
    await screen.findByRole('heading', { name: 'Lobby: ' + code }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole('heading', { name: 'Escolha do tema' }),
  ).toBeInTheDocument();
  expect(readRoomCode(playerId)).toBe(code);
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining(roomPath + '/entrada'),
    expect.objectContaining({ method: 'POST' }),
  );
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/resultado'))).toBe(
    false,
  );
  expect(screen.queryByRole('table')).toBeNull();
});

it('retoma a sala pelo UUID e mostra o resultado mesmo depois de encerrada', async () => {
  const { fetch } = mockServer({ ...baseRoom, encerrada: true });
  const { onViewResults } = mount();
  const table = await screen.findByRole('table', {
    name: 'Classificação final',
  });
  expect(
    within(table).getByRole('row', { name: '1º Anfitriã 80 6 4' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Sala encerrada/)).toBeInTheDocument();
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/continuacao'))).toBe(
    false,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Ver histórico de resultados' }),
  );
  expect(onViewResults).toHaveBeenCalledOnce();
  expect(readRoomCode(playerId)).toBe(code);
});

it('trata voto simultâneo que encontrou votação encerrada como estado normal confirmado', async () => {
  const { server, fetch } = mockServer();
  server.voteFailure = closed;
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Sim, continuar' }),
  );
  expect(
    await screen.findByText(
      'Votação encerrada. A turma não continuará para outra rodada.',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Sim, continuar' })).toBeNull();
  expect(await screen.findByRole('table')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/partidas/' + firstMatch + '/continuacao'),
    expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ continuar: true }),
    }),
  );
});

it('mantém aviso se um conflito não for explicado por encerramento ou voto registrado', async () => {
  const { server } = mockServer();
  server.voteFailure = waiting;
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Sim, continuar' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'A votação de continuação foi encerrada',
  );
});

it('não pede voto novamente enquanto espera os demais participantes', async () => {
  mockServer();
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Sim, continuar' }),
  );
  expect(
    await screen.findByText(
      'Seu voto foi registrado. Aguardando os outros participantes…',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sim, continuar' })).toBeNull();
});

it('não carrega a resposta da primeira rodada para a questão de mesmo número na segunda', async () => {
  const { server } = mockServer({ ...baseRoom, status: 'EM_ANDAMENTO' });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'A. Opção 1' }));
  expect(
    await screen.findByText(
      'Resposta registrada. Aguardando os outros participantes…',
    ),
  ).toBeInTheDocument();

  server.room = baseRoom;
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar sala' }));
  expect(
    await screen.findByRole('table', { name: 'Classificação final' }),
  ).toBeInTheDocument();

  server.room = {
    ...baseRoom,
    partidaId: null,
    status: 'PREPARACAO',
    temaId: null,
  };
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar sala' }));
  expect(
    await screen.findByRole('heading', { name: 'Escolha do tema' }),
  ).toBeInTheDocument();

  server.room = { ...baseRoom, partidaId: nextMatch, status: 'EM_ANDAMENTO' };
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar sala' }));
  expect(
    await screen.findByRole('heading', { name: 'Pergunta da segunda rodada' }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'A. Opção 1' })).toBeEnabled(),
  );
  expect(
    screen.queryByText(
      'Resposta registrada. Aguardando os outros participantes…',
    ),
  ).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
});

it.each([
  { papel: 'anfitrião', jogador: playerId, votaContinuidade: true },
  { papel: 'convidado', jogador: guestId, votaContinuidade: false },
])(
  'limpa a seleção e os totais ao reabrir a votação para $papel',
  async ({ jogador, votaContinuidade }) => {
    const preparacao = {
      ...baseRoom,
      partidaId: null,
      temaId: null,
      status: 'PREPARACAO',
    } as const;
    autenticar(jogador);
    const { server } = mockServer(preparacao);
    server.themeVote = {
      aberta: true,
      meuVoto: 'tema-01',
      totais: [{ temaId: 'tema-01', votos: 2 }],
    };
    const { client, onViewResults } = mount(true, jogador);
    const tema = await screen.findByRole('combobox', { name: 'Tema aprovado' });
    await screen.findByRole('option', { name: 'Astronomia' });
    await screen.findByText('Astronomia: 2 voto(s)');
    fireEvent.change(tema, { target: { value: 'tema-01' } });
    expect(tema).toHaveValue('tema-01');

    server.room = { ...baseRoom, status: 'PREPARACAO' };
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar sala' }));
    expect(await screen.findByText(/Tema escolhido:/)).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Tema aprovado' }),
    ).toBeNull();

    server.room = baseRoom;
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar sala' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Ver histórico de resultados' }),
    );
    expect(onViewResults).toHaveBeenCalledOnce();

    function reabrirVotacao() {
      server.room = preparacao;
      server.themeVote = { aberta: true, meuVoto: null, totais: [] };
    }
    if (votaContinuidade) {
      server.onContinue = reabrirVotacao;
      fireEvent.click(
        await screen.findByRole('button', { name: 'Sim, continuar' }),
      );
    } else {
      reabrirVotacao();
      await act(() =>
        client.refetchQueries({ queryKey: ['real-room', 'jogador@gq.test'] }),
      );
    }

    const novaEscolha = await screen.findByRole('combobox', {
      name: 'Tema aprovado',
    });
    const votar = await screen.findByRole('button', {
      name: 'Votar neste tema',
    });
    expect(novaEscolha).toHaveValue('');
    expect(screen.queryByText('Astronomia: 2 voto(s)')).toBeNull();
    await waitFor(() => expect(votar).toBeDisabled());
    fireEvent.change(novaEscolha, { target: { value: 'tema-01' } });
    await waitFor(() => expect(votar).toBeEnabled());
  },
);

it('preenche o UUID do convite e usa a API de entrada após confirmação', async () => {
  window.history.replaceState({}, '', `/?view=real-room&room=${code}`);
  try {
    const { fetch } = mockServer({
      ...baseRoom,
      status: 'PREPARACAO',
      partidaId: null,
    });
    mount(false);
    expect(
      screen.getByRole('textbox', { name: 'Código completo (UUID)' }),
    ).toHaveValue(code);
    expect(
      fetch.mock.calls.some(
        ([url, init]) => url.endsWith('/entrada') && init.method === 'POST',
      ),
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar na sala' }));
    await screen.findByRole('heading', { name: `Lobby: ${code}` });
    expect(
      fetch.mock.calls.some(
        ([url, init]) =>
          url.endsWith(roomPath + '/entrada') && init.method === 'POST',
      ),
    ).toBe(true);
    expect(new URLSearchParams(window.location.search).has('room')).toBe(false);
    expect(
      await screen.findByTitle('QR Code do convite para a sala'),
    ).toBeInTheDocument();
  } finally {
    window.history.replaceState({}, '', '/');
  }
});
