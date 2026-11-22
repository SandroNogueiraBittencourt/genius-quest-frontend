import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { readTokenClaims } from '../auth/claims';
import { useAuthStore } from '../auth/store';
import { getThemes } from '../themes/api';
import {
  closeRoomVoting,
  getRoomVoting,
  openRoomVoting,
  setRoomVote,
  type OnlineRoom,
} from './api';

export function LobbyTheme({
  room,
  onChosen,
}: {
  room: OnlineRoom;
  onChosen: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState('');
  const [tieChoice, setTieChoice] = useState('');
  const auth = useAuthStore((state) => state.session);
  const isHost =
    !!auth && readTokenClaims(auth.token)?.usuarioId === room.anfitriaoId;
  const waiting = !room.partidaId && room.status === 'PREPARACAO';
  const voting = useQuery({
    queryKey: ['room', 'voting', room.codigo, auth?.email, auth?.expiresAt],
    queryFn: ({ signal }) => getRoomVoting(room.codigo, signal),
    enabled: !!auth && waiting,
    retry: false,
    refetchInterval: 3000,
  });
  const opened = voting.data?.aberta === true;
  const themes = useQuery({
    queryKey: ['room', 'approved-themes', auth?.email, auth?.expiresAt],
    queryFn: ({ signal }) => getThemes(signal),
    enabled: !!auth && (opened || !!room.temaId),
    retry: false,
  });
  const open = useMutation({
    mutationFn: () => openRoomVoting(room.codigo),
    onSuccess: () => voting.refetch(),
  });
  const vote = useMutation({
    mutationFn: (id: string | null) => setRoomVote(room.codigo, id),
    onSuccess: async () => {
      await voting.refetch();
      setDraft('');
    },
  });
  const close = useMutation({
    mutationFn: () => closeRoomVoting(room.codigo, tieChoice || undefined),
    onSuccess: onChosen,
  });
  const approved =
    themes.data?.filter((item) => item.status === 'APROVADO') ?? [];
  const selected = approved.find((item) => item.id === room.temaId);
  const current = voting.data?.meuVoto ?? '';
  const draftId = draft || current;
  const totals = voting.data?.totais ?? [];
  const top = Math.max(0, ...totals.map((item) => item.votos));
  const leaders = totals.filter((item) => item.votos === top);
  const tied = leaders.length > 1;
  const busy = open.isPending || vote.isPending || close.isPending;
  const error = open.error ?? vote.error ?? close.error;

  return (
    <Card className="room-theme">
      <h2>Tema da partida</h2>
      {room.partidaId ? (
        <p>{selected?.titulo ?? 'Tema definido.'}</p>
      ) : opened ? (
        <>
          {themes.isPending && <p role="status">Carregando temas…</p>}
          {themes.isError && (
            <>
              <Notice message={themes.error.message} />
              <Button
                type="button"
                variant="outline"
                onClick={() => void themes.refetch()}
              >
                Tentar novamente
              </Button>
            </>
          )}
          {themes.isSuccess && !approved.length && (
            <p>Ainda não há temas aprovados.</p>
          )}
          {approved.length > 0 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  !busy &&
                  draftId !== current &&
                  approved.some((item) => item.id === draftId)
                ) {
                  vote.mutate(draftId);
                }
              }}
            >
              <fieldset className="room-theme-options" disabled={busy}>
                <legend>Vote no tema da partida</legend>
                <div className="room-theme-grid">
                  {approved.map((item) => (
                    <label className="room-theme-option" key={item.id}>
                      <input
                        type="radio"
                        name="lobby-theme"
                        value={item.id}
                        checked={draftId === item.id}
                        onChange={() => setDraft(item.id)}
                      />
                      <span>
                        <strong>{item.titulo}</strong>
                        {item.descricao && <small>{item.descricao}</small>}
                        <small>
                          Votos:{' '}
                          {totals.find((total) => total.temaId === item.id)
                            ?.votos ?? 0}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="room-inline-actions">
                <Button
                  type="submit"
                  variant="secondary"
                  busy={vote.isPending}
                  disabled={busy || !draftId || draftId === current}
                >
                  {current ? 'Trocar voto' : 'Confirmar voto'}
                </Button>
                {draft && draft !== current && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setDraft('')}
                  >
                    Desfazer escolha
                  </Button>
                )}
                {current && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => vote.mutate(null)}
                  >
                    Retirar voto
                  </Button>
                )}
              </div>
            </form>
          )}
          {isHost && (
            <div className="room-inline-actions">
              {tied && (
                <label>
                  Desempate
                  <select
                    value={tieChoice}
                    onChange={(event) => setTieChoice(event.target.value)}
                    disabled={busy}
                  >
                    <option value="">Escolher entre os empatados</option>
                    {leaders.map(({ temaId }) => {
                      const item = approved.find(
                        (option) => option.id === temaId,
                      );
                      return (
                        item && (
                          <option key={temaId} value={temaId}>
                            {item.titulo}
                          </option>
                        )
                      );
                    })}
                  </select>
                </label>
              )}
              <Button
                type="button"
                variant="outline"
                busy={close.isPending}
                disabled={
                  busy ||
                  !top ||
                  (tied && !leaders.some((item) => item.temaId === tieChoice))
                }
                onClick={() => close.mutate()}
              >
                Encerrar votação
              </Button>
            </div>
          )}
        </>
      ) : voting.isError ? (
        <>
          <Notice message={voting.error.message} />
          <Button variant="outline" onClick={() => void voting.refetch()}>
            Tentar novamente
          </Button>
        </>
      ) : isHost ? (
        <Button
          variant="secondary"
          busy={open.isPending}
          disabled={!voting.isSuccess}
          onClick={() => open.mutate()}
        >
          Começar seleção do tema
        </Button>
      ) : (
        <p>Aguardando o anfitrião abrir a votação.</p>
      )}
      {error && <Notice message={error.message} />}
    </Card>
  );
}
