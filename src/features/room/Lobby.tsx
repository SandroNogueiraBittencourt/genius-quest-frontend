import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, Notice, ProgressBar } from '../../components/ui';
import { demoGateway } from '../demo/roomGateway';
import { roomKey, useDemoRoom } from './queries';
import { useRoomStore } from './store';
import './Lobby.css';
const statusLabels = {
  waiting: 'Aguardando jogadores',
  ready: 'Pronta para começar',
  'in-progress': 'Em andamento',
};
type Action = 'add' | 'start' | 'return';
export function Lobby({ onLeave }: { onLeave: () => void }) {
  const session = useRoomStore((state) => state.session);
  const clearSession = useRoomStore((state) => state.leave);
  const query = useDemoRoom(session);
  const client = useQueryClient();
  const [copy, setCopy] = useState<'idle' | 'copying' | 'copied' | 'manual'>(
    'idle',
  );
  function goHome() {
    clearSession();
    client.removeQueries({ queryKey: roomKey(session), exact: true });
    onLeave();
  }
  const action = useMutation({
    mutationFn: (kind: Action) => {
      if (!session) throw new Error('Entre em uma sala para continuar.');
      if (kind === 'add') return demoGateway.addExamplePlayer(session);
      if (kind === 'start') return demoGateway.startRoom(session);
      return demoGateway.returnToLobby(session);
    },
    onSuccess: (room) => client.setQueryData(roomKey(session), room),
    networkMode: 'always',
  });
  const leave = useMutation({
    mutationFn: () => {
      if (!session) return Promise.resolve();
      return demoGateway.leaveRoom(session);
    },
    onSuccess: goHome,
    networkMode: 'always',
  });
  async function copyCode(code: string) {
    setCopy('copying');
    try {
      await navigator.clipboard.writeText(code);
      setCopy('copied');
    } catch {
      setCopy('manual');
    }
  }
  const room = query.data;
  const pending = action.isPending || leave.isPending;
  if (!session)
    return (
      <Card className="room-empty">
        <span className="gq-kicker">Vamos nos reunir?</span>
        <h1>Nenhuma sala aberta.</h1>
        <p>
          As salas demonstrativas ficam nesta aba. Se você recarregou a página,
          crie uma nova sala ou entre usando GQ2026.
        </p>
        <Button variant="secondary" onClick={onLeave}>
          Voltar ao início
        </Button>
      </Card>
    );
  return (
    <>
      <div className="room-heading">
        <div>
          <span className="gq-kicker">A conversa já pode começar</span>
          <h1>Um lugar para sua turma.</h1>
          <p>Quem vem descobrir com você hoje?</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => leave.mutate()}
          busy={leave.isPending}
          loadingLabel="Saindo…"
          disabled={action.isPending}
        >
          Sair da sala
        </Button>
      </div>
      <p role="status" aria-live="polite" className="gq-sr-only">
        {room
          ? `${room.participants.length} de ${room.maxPlayers} participantes. ${statusLabels[room.status]}.`
          : 'Carregando sala…'}
      </p>
      {query.isPending && (
        <Card>
          <p>Preparando sua sala…</p>
        </Card>
      )}
      {query.isError && (
        <Card>
          <Notice message={query.error.message} />
          <div className="room-inline-actions">
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              busy={query.isFetching}
            >
              Tentar novamente
            </Button>
            <Button variant="secondary" onClick={goHome}>
              Voltar ao início
            </Button>
          </div>
        </Card>
      )}
      {leave.error && <Notice message={leave.error.message} />}
      {room && (
        <div className="room-layout">
          <section className="room-main" aria-labelledby="participants-title">
            <Card>
              <div className="room-participants-header">
                <div>
                  <span className={`room-status room-status--${room.status}`}>
                    <span aria-hidden="true">
                      {room.status === 'ready'
                        ? '✓'
                        : room.status === 'in-progress'
                          ? '→'
                          : '◷'}
                    </span>
                    {statusLabels[room.status]}
                  </span>
                  <h2 id="participants-title">Nossa turma</h2>
                </div>
                <span
                  className="room-count"
                  aria-label={`${room.participants.length} de ${room.maxPlayers} participantes`}
                >
                  {room.participants.length}/{room.maxPlayers}
                </span>
              </div>
              <ProgressBar
                label="Ocupação da sala"
                value={room.participants.length}
                max={room.maxPlayers}
              />
              <ul className="room-players">
                {room.participants.map((player, index) => (
                  <li key={player.id}>
                    <Avatar name={player.name} index={index} />
                    <div>
                      <strong>{player.name}</strong>
                      <div className="room-player-tags">
                        {player.id === room.hostId && (
                          <span className="room-host-tag">Anfitrião</span>
                        )}
                        {player.id === session.playerId && (
                          <span className="room-you-tag">Você</span>
                        )}
                        {player.id !== room.hostId &&
                          player.id !== session.playerId && (
                            <span>Na turma</span>
                          )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="room-refresh">
                <span>Nomes de exemplo, histórias para compartilhar.</span>
                <Button
                  variant="ghost"
                  onClick={() => void query.refetch()}
                  busy={query.isFetching}
                  loadingLabel="Atualizando…"
                  disabled={pending}
                >
                  Atualizar sala
                </Button>
              </div>
            </Card>
            {room.status === 'in-progress' ? (
              <Card className="room-preview">
                <span className="room-celebration">A turma está reunida!</span>
                <h2>A prévia começou.</h2>
                <p>
                  Esta demonstração apresenta o estado da sala em andamento.
                  Você pode voltar ao lobby e continuar explorando a sala.
                </p>
                {room.isHost && (
                  <Button
                    variant="secondary"
                    busy={action.isPending}
                    onClick={() => action.mutate('return')}
                  >
                    Voltar ao lobby
                  </Button>
                )}
              </Card>
            ) : (
              <Card className="room-start">
                <div>
                  <h2>
                    {room.status === 'waiting'
                      ? 'Tem espaço para mais alguém.'
                      : 'Prontos para descobrir?'}
                  </h2>
                  <p>
                    {room.isHost
                      ? room.status === 'waiting'
                        ? 'Reúna pelo menos 2 pessoas para iniciar a prévia.'
                        : 'Você reúne a turma e escolhe quando começar.'
                      : `${room.participants.find((player) => player.id === room.hostId)?.name ?? 'O anfitrião'} inicia a rodada. Aproveite para conversar com a turma.`}
                  </p>
                </div>
                {room.isHost && (
                  <Button
                    variant="secondary"
                    disabled={
                      !room.canStart || leave.isPending || action.isPending
                    }
                    busy={action.isPending && action.variables === 'start'}
                    loadingLabel="Iniciando…"
                    onClick={() => action.mutate('start')}
                  >
                    Iniciar rodada demonstrativa
                  </Button>
                )}
              </Card>
            )}
            {action.error && <Notice message={action.error.message} />}
          </section>
          <aside
            className="room-sidebar"
            aria-label="Convite e configuração da sala"
          >
            <Card className="room-invite" data-surface="dark">
              <span className="gq-eyebrow">Uma sala para estar junto</span>
              <h2>Convide a turma</h2>
              <p>Este código identifica a sua sala demonstrativa.</p>
              <code className="room-code">{room.code}</code>
              <Button
                variant="secondary"
                onClick={() => void copyCode(room.code)}
                busy={copy === 'copying'}
                loadingLabel="Copiando…"
              >
                {copy === 'copied' ? 'Código copiado' : 'Copiar código'}
              </Button>
              <p role="status" className="room-copy-feedback">
                {copy === 'copied'
                  ? 'Código copiado para a área de transferência.'
                  : copy === 'manual'
                    ? `Não foi possível copiar automaticamente. Selecione o código ${room.code} e copie manualmente.`
                    : 'A demonstração funciona somente nesta aba.'}
              </p>
            </Card>
            <Card className="room-settings">
              <span className="gq-kicker">O tema da nossa conversa</span>
              <h2>{room.theme.name}</h2>
              <p>{room.theme.description}</p>
              <div className="room-pace">
                <span aria-hidden="true">◷</span>
                <div>
                  <strong>Sem pressa</strong>
                  <span>Tempo para pensar. Espaço para conversar.</span>
                </div>
              </div>
            </Card>
            {room.isHost && room.status !== 'in-progress' && (
              <div className="room-demo-control">
                <p>Quer experimentar uma turma maior?</p>
                <Button
                  variant="outline"
                  disabled={
                    room.participants.length >= room.maxPlayers || pending
                  }
                  busy={action.isPending && action.variables === 'add'}
                  loadingLabel="Adicionando…"
                  onClick={() => action.mutate('add')}
                >
                  Adicionar pessoa de exemplo
                </Button>
                <span>Participantes simulados para explorar o lobby.</span>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
