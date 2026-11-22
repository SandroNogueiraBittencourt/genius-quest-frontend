import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Avatar, Button, Card, Notice } from '../../components/ui';
import { readTokenClaims } from '../auth/claims';
import { useAuthStore } from '../auth/store';
import { closeRoom, leaveRoom } from './api';
import { LobbyTheme } from './LobbyTheme';
import { RoomMatch } from './RoomMatch';
import { useOnlineRoom } from './queries';
import { useRoomStore } from './store';
import './Lobby.css';

const statusLabels = {
  PREPARACAO: 'Aguardando jogadores',
  PRONTA: 'Pronta para começar',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export function Lobby({ onLeave }: { onLeave: () => void }) {
  const session = useRoomStore((state) => state.session);
  const query = useOnlineRoom(session?.code);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'manual'>('idle');

  function goHome() {
    useRoomStore.getState().leave();
    onLeave();
  }

  const room = query.data;
  const auth = useAuthStore((state) => state.session);
  const isHost =
    !!auth && readTokenClaims(auth.token)?.usuarioId === room?.anfitriaoId;
  const exit = useMutation({
    mutationFn: ({ code, close }: { code: string; close: boolean }) =>
      close ? closeRoom(code) : leaveRoom(code),
    onSuccess: goHome,
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeActions = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (confirmClose) closeActions.current?.querySelector('button')?.focus();
  }, [confirmClose]);

  if (room?.encerrada) {
    return (
      <Card className="room-empty">
        <h1>Sala encerrada</h1>
        <p>Esta sala foi fechada. Você pode voltar ao início.</p>
        <Button variant="secondary" onClick={goHome}>
          Voltar ao início
        </Button>
      </Card>
    );
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopy('copied');
    } catch {
      setCopy('manual');
    }
  }

  if (!session) {
    return (
      <Card className="room-empty">
        <h1>Nenhuma sala aberta.</h1>
        <Button variant="secondary" onClick={onLeave}>
          Voltar ao início
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="room-heading">
        <h1>Um lugar para sua turma.</h1>
        {room && (
          <Button
            variant="ghost"
            busy={exit.isPending && !isHost}
            disabled={exit.isPending}
            aria-expanded={isHost ? confirmClose : undefined}
            onClick={(event) => {
              if (isHost) {
                closeButton.current = event.currentTarget;
                setConfirmClose(true);
              } else {
                exit.mutate({ code: room.codigo, close: false });
              }
            }}
          >
            {isHost ? 'Fechar sala' : 'Sair da sala'}
          </Button>
        )}
      </div>
      {confirmClose && isHost && room && (
        <Card
          className="room-close-confirmation"
          role="region"
          aria-labelledby="room-close-title"
        >
          <div>
            <h2 id="room-close-title">Fechar a sala para todos?</h2>
            <p>O código de convite será desativado.</p>
          </div>
          <div className="room-inline-actions" ref={closeActions}>
            <Button
              variant="outline"
              disabled={exit.isPending}
              onClick={() => {
                setConfirmClose(false);
                closeButton.current?.focus();
              }}
            >
              Manter sala aberta
            </Button>
            <Button
              variant="secondary"
              busy={exit.isPending}
              loadingLabel="Fechando sala…"
              onClick={() => exit.mutate({ code: room.codigo, close: true })}
            >
              Confirmar fechamento
            </Button>
          </div>
        </Card>
      )}
      {exit.error && <Notice message={exit.error.message} />}
      {query.isPending && <p role="status">Carregando sala…</p>}
      {query.isError && (
        <Card>
          <Notice message={query.error.message} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </Card>
      )}
      {room && (
        <div className="room-layout">
          <section className="room-main" aria-labelledby="participants-title">
            <Card>
              <div className="room-participants-header">
                <div>
                  <span className="room-status">
                    {statusLabels[room.status]}
                  </span>
                  <h2 id="participants-title">Participantes</h2>
                </div>
                <span className="room-count" role="status">
                  {room.participantes.length}{' '}
                  {room.participantes.length === 1
                    ? 'participante'
                    : 'participantes'}
                </span>
              </div>
              <ul className="room-players">
                {room.participantes.map((player, index) => (
                  <li key={player.id}>
                    <Avatar name={player.nome} index={index} />
                    <div>
                      <strong>{player.nome}</strong>
                      {player.id === room.anfitriaoId && (
                        <div className="room-player-tags">
                          <span className="room-host-tag">Anfitrião</span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            {room.partidaId && (
              <RoomMatch
                key={room.partidaId}
                room={room}
                onStatusChange={() => query.refetch()}
              />
            )}
            <LobbyTheme
              key={room.codigo}
              room={room}
              onChosen={() => query.refetch()}
            />
          </section>
          <aside className="room-sidebar" aria-label="Convite da sala">
            <Card className="room-invite" data-surface="dark">
              <h2>Convide a turma</h2>
              <code className="room-code">{room.codigo}</code>
              <Button
                variant="secondary"
                onClick={() => void copyCode(room.codigo)}
              >
                {copy === 'copied' ? 'Código copiado' : 'Copiar código'}
              </Button>
              {copy === 'manual' && (
                <p role="status">
                  Selecione o código {room.codigo} e copie manualmente.
                </p>
              )}
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}
