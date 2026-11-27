import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { restoreSession } from './api';
import { forgetSessionUser, readSessionUser } from './sessionResume';
import { useAuthStore } from './store';
import { userIdFromJwt } from './userIdFromJwt';

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState(() =>
    useAuthStore.getState().session ? null : readSessionUser(),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!userId || failed) return;
    const controller = new AbortController();
    void restoreSession(controller.signal)
      .then(({ session, email }) => {
        if (controller.signal.aborted) return;
        if (!useAuthStore.getState().session) {
          if (userIdFromJwt(session.token)?.toLowerCase() === userId)
            useAuthStore.getState().start(session, email);
          else forgetSessionUser();
        }
        setUserId(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (
          error instanceof ApiError &&
          [401, 403, 404].includes(error.status)
        ) {
          forgetSessionUser();
          setUserId(null);
        } else {
          setFailed(true);
        }
      });
    return () => controller.abort();
  }, [userId, failed]);

  if (!userId) return children;

  return (
    <main id="conteudo" className="gq-container">
      <Card className="auth-connected">
        {failed ? (
          <>
            <Notice message="Não foi possível verificar sua sessão. Tente novamente." />
            <div className="auth-connected-actions">
              <Button onClick={() => setFailed(false)}>Tentar novamente</Button>
              <Button
                variant="outline"
                onClick={() => {
                  forgetSessionUser();
                  setUserId(null);
                }}
              >
                Continuar sem entrar
              </Button>
            </div>
          </>
        ) : (
          <p role="status">Restaurando sua sessão…</p>
        )}
      </Card>
    </main>
  );
}
