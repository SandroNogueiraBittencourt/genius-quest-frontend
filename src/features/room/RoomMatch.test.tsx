import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createQueryClient } from '../../app/queryClient';
import { useAuthStore } from '../auth/store';
import {
  answerRoomQuestion,
  getRoomQuestion,
  startRoomMatch,
  type OnlineRoom,
  getRoomContinuation,
  voteRoomContinuation,
} from './api';
import { RoomMatch } from './RoomMatch';

vi.mock('./api', () => ({
  answerRoomQuestion: vi.fn(),
  getRoomQuestion: vi.fn(),
  startRoomMatch: vi.fn(),
  getRoomContinuation: vi.fn().mockResolvedValue({
    status: 'AGUARDANDO',
    meuVoto: null,
    favoraveis: 0,
    contrarios: 0,
    totalJogadores: 2,
  }),
  voteRoomContinuation: vi.fn().mockResolvedValue({
    status: 'APROVADA',
    meuVoto: true,
    favoraveis: 2,
    contrarios: 0,
    totalJogadores: 2,
  }),
}));

const room: OnlineRoom = {
  codigo: 'sala',
  partidaId: 'partida',
  temaId: 'tema',
  anfitriaoId: 'ana',
  status: 'PREPARACAO',
  participantes: [
    { id: 'ana', nome: 'Ana' },
    { id: 'bia', nome: 'Bia' },
  ],
};
const firstQuestion = {
  partidaId: 'partida',
  numero: 1,
  totalPerguntas: 10,
  enunciado: 'Qual é a primeira pergunta?',
  alternativas: [
    'Alternativa A',
    'Alternativa B',
    'Alternativa C',
    'Alternativa D',
  ],
};

function signIn(usuarioId: string) {
  const token = 'header.' + btoa(JSON.stringify({ usuarioId })) + '.signature';
  useAuthStore
    .getState()
    .start(
      { token, tipo: 'Bearer', expiraEm: 3600 },
      `${usuarioId}@example.test`,
    );
}

beforeEach(() => {
  signIn('ana');
  vi.mocked(getRoomContinuation).mockResolvedValue({
    status: 'AGUARDANDO',
    meuVoto: null,
    favoraveis: 0,
    contrarios: 0,
    totalJogadores: 2,
  });
  vi.mocked(voteRoomContinuation).mockResolvedValue({
    status: 'APROVADA',
    meuVoto: true,
    favoraveis: 2,
    contrarios: 0,
    totalJogadores: 2,
  });
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.resetAllMocks();
});

function setup(initialRoom: OnlineRoom) {
  const client = createQueryClient();
  const onStatusChange = vi.fn().mockResolvedValue(undefined);
  const view = (data: OnlineRoom) => (
    <QueryClientProvider client={client}>
      <RoomMatch room={data} onStatusChange={onStatusChange} />
    </QueryClientProvider>
  );
  const { rerender } = render(view(initialRoom));
  return {
    onStatusChange,
    updateRoom: (data: OnlineRoom) => rerender(view(data)),
  };
}

it('mostra o erro de início e permite ao anfitrião tentar novamente', async () => {
  vi.mocked(startRoomMatch)
    .mockRejectedValueOnce(new Error('Faltam perguntas aprovadas'))
    .mockResolvedValueOnce(firstQuestion);
  const { onStatusChange } = setup(room);
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Faltam perguntas aprovadas',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }));
  await waitFor(() => expect(onStatusChange).toHaveBeenCalledOnce());
});

it('mostra ao convidado que o anfitrião ainda precisa iniciar', () => {
  signIn('bia');
  setup(room);
  expect(
    screen.getByText('Aguardando o anfitrião iniciar a partida.'),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Iniciar partida' }),
  ).not.toBeInTheDocument();
});

it('aguarda os demais após responder e mostra a próxima pergunta compartilhada', async () => {
  vi.mocked(getRoomQuestion).mockResolvedValue(firstQuestion);
  vi.mocked(answerRoomQuestion).mockResolvedValue({
    perguntaRespondida: 1,
    perguntaAtual: 1,
    status: 'EM_ANDAMENTO',
  });
  const { updateRoom } = setup({ ...room, status: 'EM_ANDAMENTO' });
  fireEvent.click(await screen.findByRole('radio', { name: 'Alternativa C' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar resposta' }));
  expect(await screen.findByText(/Resposta registrada/)).toBeInTheDocument();
  expect(answerRoomQuestion).toHaveBeenCalledWith('sala', 1, 2);
  expect(screen.getByRole('radio', { name: 'Alternativa C' })).toBeDisabled();

  vi.mocked(getRoomQuestion).mockResolvedValue({
    ...firstQuestion,
    numero: 2,
    enunciado: 'A próxima pergunta',
  });
  expect(
    await screen.findByRole(
      'heading',
      { name: 'A próxima pergunta' },
      { timeout: 4000 },
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Confirmar resposta' }),
  ).toBeDisabled();
  updateRoom({ ...room, status: 'CONCLUIDA' });
  expect(
    screen.getByRole('heading', { name: 'Partida concluída' }),
  ).toBeInTheDocument();
}, 7000);

it('envia voto de continuação e atualiza a sala quando alcança maioria', async () => {
  const { onStatusChange } = setup({ ...room, status: 'CONCLUIDA' });
  fireEvent.click(
    await screen.findByRole('button', { name: 'Jogar outra rodada' }),
  );
  await waitFor(() => expect(onStatusChange).toHaveBeenCalledOnce());
});
