import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './app/queryClient';
import { useNavigation, type View } from './app/navigation';
import { ApiHealth } from './app/ApiHealth';
import { DesignSystem } from './features/design-system/DesignSystem';
import { Home } from './features/home/Home';
import { Lobby } from './features/room/Lobby';
import { useRoomStore } from './features/room/store';
import './App.css';
import './styles/app-shell.css';
function Pages() {
  const { view, navigate } = useNavigation();
  const session = useRoomStore((state) => state.session);
  const previousView = useRef(view);
  useEffect(() => {
    document.title =
      view === 'lobby'
        ? 'Sua sala · Genius Quest'
        : view === 'design-system'
          ? 'Design System · Genius Quest'
          : 'Genius Quest · Cada pergunta, uma nova memória';
    if (previousView.current !== view) {
      const heading = document.querySelector<HTMLElement>('main h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
      previousView.current = view;
    }
  }, [view]);
  function open(event: MouseEvent<HTMLAnchorElement>, next: View) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(next);
  }
  if (view === 'design-system')
    return (
      <DesignSystem
        apiStatus={<ApiHealth />}
        backLink={
          <a
            className="gq-catalog-back"
            href="?"
            onClick={(event) => open(event, 'home')}
          >
            ← Voltar à abertura
          </a>
        }
      />
    );
  return (
    <>
      <a className="ds-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="gq-header">
        <a
          href="?"
          onClick={(event) => open(event, 'home')}
          aria-label="Genius Quest, início"
        >
          <img
            src="/brand/genius-quest-horizontal.svg"
            alt="Genius Quest"
            width="200"
          />
        </a>
        <nav aria-label="Navegação principal">
          <a
            href="?"
            aria-current={view === 'home' ? 'page' : undefined}
            onClick={(event) => open(event, 'home')}
          >
            Início
          </a>
          {session && (
            <a
              href="?view=lobby"
              aria-current={view === 'lobby' ? 'page' : undefined}
              onClick={(event) => open(event, 'lobby')}
            >
              Minha sala
            </a>
          )}
          <a
            href="?view=design-system"
            onClick={(event) => open(event, 'design-system')}
          >
            Design System
          </a>
        </nav>
      </header>
      <div className="gq-demo-banner">
        <span className="gq-demo-label">Demonstração</span>
        <p>
          Salas e participantes de exemplo, somente nesta aba. Sem conexão entre
          dispositivos.
        </p>
      </div>
      <main id="conteudo" tabIndex={-1} className="gq-main">
        {view === 'lobby' ? (
          <Lobby onLeave={() => navigate('home')} />
        ) : (
          <Home onEnter={() => navigate('lobby')} />
        )}
      </main>
      <footer className="gq-footer">
        <span>Genius Quest · A curiosidade aproxima.</span>
        <ApiHealth />
      </footer>
    </>
  );
}
export default function App() {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <Pages />
    </QueryClientProvider>
  );
}
