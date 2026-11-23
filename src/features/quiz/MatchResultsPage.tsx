import { Button, Card } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { MatchResultsHistory } from './MatchResultsHistory';
import './MatchResultsPage.css';

export function MatchResultsPage({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="history-page">
      <header className="history-heading">
        <h1>Resultados</h1>
      </header>
      {session ? (
        <MatchResultsHistory key={session.token} />
      ) : (
        <Card>
          <p>Entre na sua conta para consultar o placar das suas partidas.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para ver resultados
          </Button>
        </Card>
      )}
    </section>
  );
}
