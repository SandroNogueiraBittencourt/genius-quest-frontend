import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { readTokenClaims } from '../auth/claims';
import { useAuthStore } from '../auth/store';
import {
  answerRoomQuestion,
  getRoomQuestion,
  startRoomMatch,
  type OnlineRoom,
  type RoomQuestion,
} from './api';
import { RoomContinuation } from './RoomContinuation';

export function RoomMatch({
  room,
  onStatusChange,
}: {
  room: OnlineRoom;
  onStatusChange: () => Promise<unknown>;
}) {
  const auth = useAuthStore((state) => state.session);
  const isHost =
    !!auth && readTokenClaims(auth.token)?.usuarioId === room.anfitriaoId;
  const start = useMutation({
    mutationFn: () => startRoomMatch(room.codigo),
    onSuccess: onStatusChange,
  });
  const question = useQuery({
    queryKey: [
      'room',
      'question',
      auth?.email,
      auth?.expiresAt,
      room.codigo,
      room.partidaId,
    ],
    queryFn: ({ signal }) => getRoomQuestion(room.codigo, signal),
    enabled: !!auth && room.status === 'EM_ANDAMENTO',
    retry: false,
    refetchInterval: 3000,
  });

  if (room.status === 'CONCLUIDA' && room.partidaId) {
    return (
      <RoomContinuation
        codigo={room.codigo}
        partidaId={room.partidaId}
        onStatusChange={onStatusChange}
      />
    );
  }

  if (room.status === 'PREPARACAO') {
    return (
      <Card className="room-theme">
        <h2>Início da partida</h2>
        {isHost ? (
          <Button
            variant="secondary"
            onClick={() => start.mutate()}
            busy={start.isPending}
            loadingLabel="Iniciando…"
          >
            Iniciar partida
          </Button>
        ) : (
          <p>Aguardando o anfitrião iniciar a partida.</p>
        )}
        {start.error && <Notice message={start.error.message} />}
      </Card>
    );
  }

  if (room.status !== 'EM_ANDAMENTO') return null;

  return (
    <Card className="room-theme">
      {question.isPending && <p role="status">Carregando pergunta…</p>}
      {question.isError && (
        <>
          <Notice message={question.error.message} />
          <Button
            variant="outline"
            onClick={() => {
              void question.refetch();
              void onStatusChange();
            }}
          >
            Tentar novamente
          </Button>
        </>
      )}
      {question.data && (
        <QuestionForm
          key={question.data.numero}
          question={question.data}
          code={room.codigo}
          synchronize={async (finished) => {
            if (finished) await onStatusChange();
            else await question.refetch();
          }}
        />
      )}
    </Card>
  );
}

function QuestionForm({
  question,
  code,
  synchronize,
}: {
  question: RoomQuestion;
  code: string;
  synchronize: (finished: boolean) => Promise<void>;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const answer = useMutation({
    mutationFn: (index: number) =>
      answerRoomQuestion(code, question.numero, index),
    onSuccess: async (result) => {
      if (result.status === 'CONCLUIDA') await synchronize(true);
      else if (result.perguntaAtual !== question.numero)
        await synchronize(false);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await Promise.all([synchronize(false), synchronize(true)]);
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (choice !== null && !answer.isPending && !answer.isSuccess)
          answer.mutate(choice);
      }}
    >
      <p role="status">
        Pergunta {question.numero} de {question.totalPerguntas}
      </p>
      <h2>{question.enunciado}</h2>
      <fieldset
        className="room-theme-options"
        disabled={answer.isPending || answer.isSuccess}
      >
        <legend>Escolha uma alternativa</legend>
        <div className="room-theme-grid">
          {question.alternativas.map((item, index) => (
            <label className="room-theme-option" key={index}>
              <input
                type="radio"
                name="room-answer"
                checked={choice === index}
                onChange={() => setChoice(index)}
              />
              <strong>{item}</strong>
            </label>
          ))}
        </div>
      </fieldset>
      {answer.isSuccess ? (
        <p role="status">
          Resposta registrada. Aguardando os outros jogadores.
        </p>
      ) : (
        <Button
          type="submit"
          variant="secondary"
          busy={answer.isPending}
          disabled={choice === null}
        >
          Confirmar resposta
        </Button>
      )}
      {answer.error && <Notice message={answer.error.message} />}
    </form>
  );
}
