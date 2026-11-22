import { useState } from 'react';
import { Avatar, Button, Card, Notice } from '../../components/ui';
import { LobbyTheme } from './LobbyTheme';
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

  const room = query.data;
  return (
    <>
      <div className="room-heading">
        <h1>Um lugar para sua turma.</h1>
        <Button
          variant="ghost"
          onClick={() => {
            useRoomStore.getState().leave();
            onLeave();
          }}
        >
          Voltar ao início
        </Button>
      </div>
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
