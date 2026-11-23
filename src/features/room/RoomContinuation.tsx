import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { getRoomContinuation, voteRoomContinuation } from './api';
import { RoomResults } from './RoomResults';

export function RoomContinuation({
  codigo,
  partidaId,
  onStatusChange,
}: {
  codigo: string;
  partidaId: string;
  onStatusChange: () => Promise<unknown>;
}) {
  const auth = useAuthStore((state) => state.session);
  const query = useQuery({
    queryKey: [
      'room',
      'continuation',
      auth?.email,
      auth?.expiresAt,
      codigo,
      partidaId,
    ],
    queryFn: ({ signal }) => getRoomContinuation(codigo, partidaId, signal),
    enabled: !!auth,
    retry: false,
    refetchInterval: (current) =>
      current.state.data?.status === 'ENCERRADA' ? false : 3000,
  });
  const vote = useMutation({
    mutationFn: (continuar: boolean) =>
      voteRoomContinuation(codigo, partidaId, continuar),
    onSuccess: async (result) => {
      if (result.status === 'APROVADA') await onStatusChange();
      else await query.refetch();
    },
    onError: () => query.refetch(),
  });
  const state = query.data;
  return (
    <Card className="room-theme">
      <h2>Partida concluída</h2>
      <RoomResults codigo={codigo} partidaId={partidaId} />
      {query.isPending && <p role="status">Carregando votação…</p>}
      {query.error && (
        <>
          <Notice message={query.error.message} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </>
      )}
      {state?.status === 'ENCERRADA' && (
        <p role="status">A partida terminou sem nova rodada.</p>
      )}
      {state?.status === 'APROVADA' && (
        <p role="status">Nova votação de tema aberta.</p>
      )}
      {state?.status === 'AGUARDANDO' && (
        <>
          <h3>Jogar outra rodada?</h3>
          <p role="status">
            {state.favoraveis} de {state.totalJogadores} jogadores votaram para
            continuar.
          </p>
          {state.meuVoto === null ? (
            <div className="room-inline-actions">
              <Button
                variant="secondary"
                onClick={() => vote.mutate(true)}
                disabled={vote.isPending}
              >
                Jogar outra rodada
              </Button>
              <Button
                variant="outline"
                onClick={() => vote.mutate(false)}
                disabled={vote.isPending}
              >
                Encerrar
              </Button>
            </div>
          ) : (
            <p>Voto registrado. Aguardando os outros jogadores.</p>
          )}
        </>
      )}
      {vote.error && <Notice message={vote.error.message} />}
    </Card>
  );
}
