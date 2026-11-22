import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Avatar, Button, Card, Input, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { createRoom, joinRoom, type OnlineRoom } from '../room/api';
import { useRoomStore } from '../room/store';
import './Home.css';
export function Home({
  onEnter,
  onSignIn,
}: {
  onEnter: () => void;
  onSignIn: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const session = useRoomStore((state) => state.session);
  const auth = useAuthStore((state) => state.session);
  const enter = useRoomStore((state) => state.enter);
  function roomCreated(room: OnlineRoom) {
    enter({ code: room.codigo });
    onEnter();
  }
  const create = useMutation({
    mutationFn: createRoom,
    onSuccess: roomCreated,
    networkMode: 'always',
  });
  const join = useMutation({
    mutationFn: joinRoom,
    onSuccess: roomCreated,
    networkMode: 'always',
  });
  useEffect(() => {
    if (joining) formRef.current?.querySelector('input')?.focus();
  }, [joining]);

  function chooseMode(next: 'create' | 'join') {
    if (!auth) {
      onSignIn();
      return;
    }
    create.reset();
    join.reset();
    setJoining(next === 'join');
    if (next === 'create') create.mutate();
  }
  return (
    <>
      {session && (
        <Card className="home-active-session">
          <div>
            <strong>Sua sala {session.code} continua aberta.</strong>
            <p>
              Volte à sala para continuar ou saia pelo lobby antes de criar
              outra.
            </p>
          </div>
          <Button variant="secondary" onClick={onEnter}>
            Voltar para a sala
          </Button>
        </Card>
      )}
      <section
        className="home-hero"
        data-surface="dark"
        aria-labelledby="home-title"
      >
        <div className="home-copy">
          <span className="gq-eyebrow">Curiosidade que aproxima</span>
          <h1 id="home-title">
            Cada pergunta,
            <br />
            uma nova memória.
          </h1>
          <p>
            Reúna as pessoas que você gosta. Descubram coisas novas,
            compartilhem histórias e celebrem juntos.
          </p>
          <div className="home-actions" ref={actionsRef}>
            <Button
              variant="secondary"
              disabled={!!session || join.isPending}
              busy={create.isPending}
              loadingLabel="Criando sala…"
              onClick={() => chooseMode('create')}
            >
              Reunir a turma <span aria-hidden="true">↗</span>
            </Button>
            <Button
              variant="outline"
              disabled={!!session || create.isPending}
              aria-expanded={joining}
              onClick={() => chooseMode('join')}
            >
              Entrar em uma sala
            </Button>
          </div>
          <div className="home-people">
            <div aria-hidden="true">
              <Avatar name="Ana Lima" />
              <Avatar name="Pedro Santos" index={1} />
              <Avatar name="Maria Costa" index={2} />
            </div>
            <span>Dos 12 aos 99. Todo mundo tem algo a descobrir.</span>
          </div>
        </div>
        <div className="home-brand">
          <div className="home-symbol">
            <img
              src="/brand/genius-quest-icon.svg"
              alt="Símbolo original Genius Quest: lâmpada com interrogação"
              width="180"
              height="180"
            />
          </div>
          <span className="home-affection">
            A melhor descoberta
            <br />é estar junto.
          </span>
        </div>
        <ul className="home-principles">
          <li>
            <strong>Sem pressa</strong>
            <span>Tempo para pensar e conversar</span>
          </li>
          <li>
            <strong>Salas online</strong>
            <span>Uma sala para a sua turma</span>
          </li>
          <li>
            <strong>Descobertas coletivas</strong>
            <span>Aprender vale mais quando é junto</span>
          </li>
        </ul>
      </section>
      {create.error && <Notice message={create.error.message} />}
      {joining && auth && (
        <section className="home-entry" aria-labelledby="entry-title">
          <Card>
            <div className="home-entry-heading">
              <div>
                <span className="gq-kicker">Vamos começar</span>
                <h2 id="entry-title">Sua turma está esperando.</h2>
              </div>
              <Button
                variant="ghost"
                disabled={join.isPending}
                onClick={() => {
                  actionsRef.current
                    ?.querySelectorAll<HTMLButtonElement>('button')[1]
                    ?.focus();
                  setJoining(false);
                  setCode('');
                }}
              >
                Fechar formulário
              </Button>
            </div>
            <form
              ref={formRef}
              onSubmit={(event) => {
                event.preventDefault();
                if (join.isPending) return;
                join.mutate(code);
              }}
            >
              <Input
                label="Código da sala"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                minLength={36}
                autoComplete="off"
                spellCheck={false}
                disabled={join.isPending}
              />
              {join.error && (
                <Notice
                  message={
                    join.error instanceof Error
                      ? join.error.message
                      : 'Não foi possível abrir a sala. Tente novamente.'
                  }
                />
              )}
              <div className="home-form-actions">
                <Button
                  variant="secondary"
                  type="submit"
                  busy={join.isPending}
                  loadingLabel="Entrando na sala…"
                >
                  Entrar na sala
                </Button>
                <span>Sem pressa, com espaço para todo mundo.</span>
              </div>
            </form>
          </Card>
        </section>
      )}
      <section className="home-how" aria-labelledby="how-title">
        <div className="home-section-heading">
          <span className="gq-kicker">
            Simples de reunir. Gostoso de jogar.
          </span>
          <h2 id="how-title">Três passos, muitas histórias.</h2>
        </div>
        <div className="home-steps">
          <Card>
            <span className="home-step">01</span>
            <h3>Crie uma sala</h3>
            <p>
              Abra o lobby para reunir a turma. O anfitrião pode escolher o tema
              depois.
            </p>
          </Card>
          <Card>
            <span className="home-step">02</span>
            <h3>Convide quem você gosta</h3>
            <p>
              Uma sala, um código e muitas perspectivas. Cada pessoa traz um
              jeito de ver o mundo.
            </p>
          </Card>
          <Card>
            <span className="home-step">03</span>
            <h3>Descubram juntos</h3>
            <p>
              Uma pergunta abre uma conversa. Acertos são celebrados e dúvidas
              viram novas descobertas.
            </p>
          </Card>
        </div>
      </section>
      <aside className="home-care">
        <strong>A curiosidade também merece cuidado.</strong>
        <p>
          Perguntas com apoio de IA podem precisar de revisão. Se algo parecer
          estranho, haverá espaço para reportar e aprender com isso.
        </p>
      </aside>
    </>
  );
}
