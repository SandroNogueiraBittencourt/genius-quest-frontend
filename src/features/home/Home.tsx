import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Avatar, Button, Card, Input, Notice } from '../../components/ui';
import { demoGateway } from '../demo/roomGateway';
import { useDemoThemes } from '../room/queries';
import { useRoomStore } from '../room/store';
import type { RoomSession } from '../room/types';
import './Home.css';
type Mode = 'create' | 'join';
export function Home({ onEnter }: { onEnter: () => void }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [themeId, setThemeId] = useState('nature');
  const formRef = useRef<HTMLFormElement>(null);
  const themes = useDemoThemes();
  const enter = useRoomStore((state) => state.enter);
  function roomCreated(session: RoomSession) {
    enter(session);
    onEnter();
  }
  const create = useMutation({
    mutationFn: demoGateway.createRoom,
    onSuccess: roomCreated,
    networkMode: 'always',
  });
  const join = useMutation({
    mutationFn: demoGateway.joinRoom,
    onSuccess: roomCreated,
    networkMode: 'always',
  });
  const activeMutation = mode === 'join' ? join : create;
  useEffect(() => {
    if (mode) formRef.current?.querySelector('input')?.focus();
  }, [mode]);
  function chooseMode(next: Mode) {
    create.reset();
    join.reset();
    setMode(next);
  }
  return (
    <>
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
          <div className="home-actions">
            <Button
              variant="secondary"
              aria-expanded={mode === 'create'}
              onClick={() => chooseMode('create')}
            >
              Reunir a turma <span aria-hidden="true">↗</span>
            </Button>
            <Button
              variant="outline"
              aria-expanded={mode === 'join'}
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
            <strong>2 a 20 pessoas</strong>
            <span>Uma sala para a sua turma</span>
          </li>
          <li>
            <strong>Descobertas coletivas</strong>
            <span>Aprender vale mais quando é junto</span>
          </li>
        </ul>
      </section>
      {mode && (
        <section className="home-entry" aria-labelledby="entry-title">
          <Card>
            <div className="home-entry-heading">
              <div>
                <span className="gq-kicker">Vamos começar</span>
                <h2 id="entry-title">
                  {mode === 'create'
                    ? 'Um convite para descobrir.'
                    : 'Sua turma está esperando.'}
                </h2>
              </div>
              <Button
                variant="ghost"
                disabled={activeMutation.isPending}
                onClick={() => {
                  setMode(null);
                  setName('');
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
                if (activeMutation.isPending) return;
                if (mode === 'create') create.mutate({ name, themeId });
                else join.mutate({ name, code });
              }}
            >
              <Input
                label="Como podemos chamar você?"
                autoComplete="given-name"
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                required
                hint="Seu nome aparece para a turma nesta demonstração."
                disabled={activeMutation.isPending}
              />
              {mode === 'join' ? (
                <Input
                  label="Código da sala"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  placeholder="Ex.: GQ2026"
                  required
                  minLength={6}
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                  hint="Para experimentar, use o código de exemplo GQ2026."
                  disabled={activeMutation.isPending}
                />
              ) : (
                <fieldset
                  className="home-theme-picker"
                  disabled={create.isPending}
                >
                  <legend>O que vamos descobrir?</legend>
                  {themes.isPending && (
                    <p role="status">Carregando temas de exemplo…</p>
                  )}
                  {themes.isError && (
                    <div>
                      <Notice message="Não foi possível carregar os temas. Tente novamente." />
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => void themes.refetch()}
                      >
                        Tentar carregar temas
                      </Button>
                    </div>
                  )}
                  <div>
                    {themes.data?.map((theme, index) => (
                      <label
                        key={theme.id}
                        className={
                          themeId === theme.id
                            ? 'home-theme home-theme--selected'
                            : 'home-theme'
                        }
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={theme.id}
                          checked={themeId === theme.id}
                          onChange={() => setThemeId(theme.id)}
                        />
                        <span className="home-theme-number" aria-hidden="true">
                          0{index + 1}
                        </span>
                        <span>
                          <strong>{theme.name}</strong>
                          <span>{theme.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {activeMutation.error && (
                <Notice
                  message={
                    activeMutation.error instanceof Error
                      ? activeMutation.error.message
                      : 'Não foi possível abrir a sala. Tente novamente.'
                  }
                />
              )}
              <div className="home-form-actions">
                <Button
                  variant="secondary"
                  type="submit"
                  busy={activeMutation.isPending}
                  loadingLabel={
                    mode === 'create' ? 'Criando sala…' : 'Entrando na sala…'
                  }
                  disabled={mode === 'create' && !themes.data?.length}
                >
                  {mode === 'create'
                    ? 'Criar sala demonstrativa'
                    : 'Entrar na sala demonstrativa'}
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
            <h3>Escolha um tema</h3>
            <p>
              De curiosidades do dia a dia a memórias de cinema. Encontre algo
              que desperte a turma.
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
