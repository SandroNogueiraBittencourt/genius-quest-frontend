import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './app/queryClient';
import { useNavigation, type View } from './app/navigation';
import { ApiHealth } from './app/ApiHealth';
import { DesignSystem } from './features/design-system/DesignSystem';
import { Categories } from './features/categories/Categories';
import { CategoriesAdmin } from './features/categories/CategoriesAdmin';
import { Themes } from './features/themes/Themes';
import { ThemesAdmin } from './features/themes/ThemesAdmin';
import { VotingHistory } from './features/themes/VotingHistory';
import { QuizPreparation } from './features/quiz/QuizPreparation';
import { hasAdminClaim } from './features/categories/permissions';
import { Home } from './features/home/Home';
import { Lobby } from './features/room/Lobby';
import { useRoomStore } from './features/room/store';
import { Button } from './components/ui';
import { AuthPage, ConnectedAccount } from './features/auth/AuthPage';
import { AuthLifecycle } from './features/auth/AuthLifecycle';
import { logout as revokeSession } from './features/auth/api';
import { ApiError } from './services/http';
import { useAuthStore } from './features/auth/store';
import './App.css';
import './styles/app-shell.css';
function Pages() {
  const { view, navigate } = useNavigation();
  const auth = useAuthStore((state) => state.session);
  const notice = useAuthStore((state) => state.notice);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [afterLogin, setAfterLogin] = useState<View>('home');
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutInFlight = useRef(false);
  const isAuthView = view === 'login' || view === 'register';
  const isCommunityView =
    view === 'categories' ||
    view === 'categories-admin' ||
    view === 'themes' ||
    view === 'themes-admin' ||
    view === 'history' ||
    view === 'quiz';
  async function logout() {
    const current = useAuthStore.getState().session;
    if (!current || logoutInFlight.current) return;

    logoutInFlight.current = true;
    setLogoutPending(true);
    setLogoutError('');

    try {
      await revokeSession(current.token);
      // Uma resposta antiga não pode encerrar um login feito durante o logout.
      if (useAuthStore.getState().session?.token === current.token) {
        useAuthStore.getState().end('signed-out', current.token);
        setRegisteredEmail('');
        navigate('home');
      }
    } catch (error) {
      if (useAuthStore.getState().session?.token !== current.token) return;

      if (error instanceof ApiError && error.status === 401) {
        // O servidor já considera esse JWT inválido ou revogado.
        useAuthStore.getState().end('unauthorized', current.token);
        setRegisteredEmail('');
        navigate('home');
      } else {
        // Não afirmar que houve revogação se a API não confirmou o logout.
        setLogoutError(
          'Não foi possível encerrar sua sessão no servidor. Verifique a conexão e tente novamente.',
        );
      }
    } finally {
      logoutInFlight.current = false;
      setLogoutPending(false);
    }
  }
  const session = useRoomStore((state) => state.session);
  const screenId = `${view}:${!!auth}`;
  const previousView = useRef(screenId);
  useEffect(() => {
    document.title =
      view === 'login'
        ? 'Entrar · Genius Quest'
        : view === 'register'
          ? 'Criar conta · Genius Quest'
          : view === 'categories'
            ? 'Categorias · Genius Quest'
            : view === 'categories-admin'
              ? 'Moderação de categorias · Genius Quest'
              : view === 'themes'
                ? 'Temas · Genius Quest'
                : view === 'themes-admin'
                  ? 'Moderação de temas · Genius Quest'
                  : view === 'history'
                    ? 'Resultados e histórico · Genius Quest'
                    : view === 'quiz'
                      ? 'Minhas partidas · Genius Quest'
                      : view === 'lobby'
                        ? 'Sua sala · Genius Quest'
                        : view === 'design-system'
                          ? 'Design System · Genius Quest'
                          : 'Genius Quest · Cada pergunta, uma nova memória';
    if (previousView.current !== screenId) {
      const heading = document.querySelector<HTMLElement>('main h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
      previousView.current = screenId;
    }
  }, [view, screenId]);
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
    if (next === 'login' || next === 'register')
      setAfterLogin(isCommunityView ? view : 'home');
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
          <a
            href="?view=categories"
            aria-current={view === 'categories' ? 'page' : undefined}
            onClick={(event) => open(event, 'categories')}
          >
            Categorias
          </a>
          <a
            href="?view=themes"
            aria-current={view === 'themes' ? 'page' : undefined}
            onClick={(event) => open(event, 'themes')}
          >
            Temas e votação
          </a>
          <a
            href="?view=history"
            aria-current={view === 'history' ? 'page' : undefined}
            onClick={(event) => open(event, 'history')}
          >
            Resultados
          </a>
          <a
            href="?view=quiz"
            aria-current={view === 'quiz' ? 'page' : undefined}
            onClick={(event) => open(event, 'quiz')}
          >
            Minhas partidas
          </a>
          {auth && hasAdminClaim(auth.token) && (
            <a
              href="?view=themes-admin"
              aria-current={view === 'themes-admin' ? 'page' : undefined}
              onClick={(event) => open(event, 'themes-admin')}
            >
              Moderar temas
            </a>
          )}
          {auth && hasAdminClaim(auth.token) && (
            <a
              href="?view=categories-admin"
              aria-current={view === 'categories-admin' ? 'page' : undefined}
              onClick={(event) => open(event, 'categories-admin')}
            >
              Moderação
            </a>
          )}
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
          {auth ? (
            <>
              <a
                href="?view=login"
                aria-current={isAuthView ? 'page' : undefined}
                onClick={(event) => open(event, 'login')}
              >
                Minha conta
              </a>
              <Button
                className="auth-nav-button"
                variant="outline"
                busy={logoutPending}
                loadingLabel="Saindo…"
                onClick={() => void logout()}
              >
                Sair
              </Button>
            </>
          ) : (
            <>
              <a
                href="?view=login"
                aria-current={view === 'login' ? 'page' : undefined}
                onClick={(event) => open(event, 'login')}
              >
                Entrar
              </a>
              <a
                className="auth-nav-signup"
                href="?view=register"
                aria-current={view === 'register' ? 'page' : undefined}
                onClick={(event) => open(event, 'register')}
              >
                Criar conta
              </a>
            </>
          )}
        </nav>
      </header>
      {(view === 'home' || view === 'lobby') && (
        <div className="gq-demo-banner">
          <span className="gq-demo-label">Demonstração</span>
          <p>
            Salas e participantes de exemplo, somente nesta aba. Sem conexão
            entre dispositivos.
          </p>
        </div>
      )}
      <main id="conteudo" tabIndex={-1} className="gq-main">
        {logoutError && (
          <p className="auth-logout-error" role="alert">
            {logoutError}
          </p>
        )}
        {notice && (
          <div className="auth-notice">
            <p role="status">
              {notice === 'signed-out'
                ? 'Você saiu da sua conta.'
                : notice === 'expired'
                  ? 'Sua sessão expirou. Entre novamente.'
                  : 'Sua sessão não está mais válida. Entre novamente.'}
            </p>
            <div className="auth-notice-actions">
              {!isAuthView && notice !== 'signed-out' && (
                <a href="?view=login" onClick={(event) => open(event, 'login')}>
                  Entrar novamente
                </a>
              )}
              <Button
                variant="ghost"
                onClick={() => useAuthStore.getState().dismissNotice()}
              >
                Fechar aviso
              </Button>
            </div>
          </div>
        )}
        {isAuthView ? (
          auth ? (
            <ConnectedAccount
              onHome={() => navigate('home')}
              onLogout={() => void logout()}
              logoutPending={logoutPending}
            />
          ) : (
            <AuthPage
              key={view}
              mode={view}
              initialEmail={registeredEmail}
              registered={!!registeredEmail}
              onSwitch={(mode) => navigate(mode)}
              onRegistered={(email) => {
                setRegisteredEmail(email);
                useAuthStore.getState().dismissNotice();
                navigate('login');
              }}
              onSignedIn={() => {
                setRegisteredEmail('');
                navigate(afterLogin);
                setAfterLogin('home');
              }}
            />
          )
        ) : view === 'categories' ? (
          <Categories
            onSignIn={() => {
              setAfterLogin('categories');
              navigate('login');
            }}
          />
        ) : view === 'categories-admin' ? (
          <CategoriesAdmin
            onSignIn={() => {
              setAfterLogin('categories-admin');
              navigate('login');
            }}
          />
        ) : view === 'themes' ? (
          <Themes
            onSignIn={() => {
              setAfterLogin('themes');
              navigate('login');
            }}
          />
        ) : view === 'history' ? (
          <VotingHistory
            onSignIn={() => {
              setAfterLogin('history');
              navigate('login');
            }}
            onOpenMatch={() => navigate('quiz')}
          />
        ) : view === 'quiz' ? (
          <QuizPreparation
            onSignIn={() => {
              setAfterLogin('quiz');
              navigate('login');
            }}
            onViewHistory={() => navigate('history')}
          />
        ) : view === 'themes-admin' ? (
          <ThemesAdmin
            onSignIn={() => {
              setAfterLogin('themes-admin');
              navigate('login');
            }}
          />
        ) : view === 'lobby' ? (
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
      <AuthLifecycle />
      <Pages />
    </QueryClientProvider>
  );
}
