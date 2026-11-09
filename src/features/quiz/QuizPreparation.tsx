import { useQuery } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { getMyMatches } from './api';
import './QuizPreparation.css';

export function QuizPreparation({
  onSignIn,
  onViewHistory,
}: {
  onSignIn: () => void;
  onViewHistory: () => void;
}) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="quiz-preparation">
      <header className="quiz-preparation-heading">
        <span className="gq-kicker">Do tema vencedor à nova descoberta</span>
        <h1>Minhas partidas.</h1>
        <p>
          Prepare partidas a partir dos temas que venceram as votações.
          O quiz com perguntas e pontuação será liberado em outra etapa.
        </p>
      </header>
      {session ? (
        <SignedInMatches key={session.token} onViewHistory={onViewHistory} />
      ) : (
        <Card>
          <h2>Entre para preparar uma partida.</h2>
          <p>As partidas ficam vinculadas à sua conta.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar na minha conta
          </Button>
        </Card>
      )}
    </section>
  );
}

function SignedInMatches({ onViewHistory }: { onViewHistory: () => void }) {
  const session = useAuthStore((state) => state.session);
  const matches = useQuery({
    queryKey: ['quiz', 'my-matches', session?.email, session?.expiresAt],
    queryFn: ({ signal }) => getMyMatches(signal),
    enabled: !!session,
    retry: false,
  });

  return (
    <>
      <div className="quiz-preparation-toolbar">
        <h2>Partidas em preparação</h2>
        <div className="quiz-preparation-actions">
          <Button variant="outline" onClick={onViewHistory}>
            Ver vencedores
          </Button>
          <Button
            variant="outline"
            disabled={matches.isPending}
            onClick={() => void matches.refetch()}
          >
            Atualizar
          </Button>
        </div>
      </div>
      {matches.isPending ? (
        <p role="status">Consultando suas partidas…</p>
      ) : matches.isError ? (
        <Card>
          <Notice message="Não foi possível consultar as partidas. Verifique sua conexão." />
          <Button variant="outline" onClick={() => void matches.refetch()}>
            Tentar novamente
          </Button>
        </Card>
      ) : matches.data.length === 0 ? (
        <Card>
          <h3>Você ainda não preparou nenhuma partida.</h3>
          <p>
            Escolha uma votação encerrada com vencedor na página Resultados
            e clique em “Preparar partida com este tema”.
          </p>
          <Button variant="secondary" onClick={onViewHistory}>
            Explorar resultados
          </Button>
        </Card>
      ) : (
        <ul className="quiz-preparation-list">
          {matches.data.map((match) => (
            <li key={match.id}>
              <Card className="quiz-preparation-card">
                <span className="quiz-preparation-status">Em preparação</span>
                <h3>{match.temaTitulo}</h3>
                <p>
                  Categoria: <strong>{match.categoriaNome}</strong>
                </p>
                <p>
                  Origem: <strong>{match.cicloNome}</strong>
                </p>
                <p>
                  <time dateTime={match.criadoEm}>
                    Preparada em {new Date(match.criadoEm).toLocaleString('pt-BR')}
                  </time>
                </p>
                <p className="quiz-preparation-disclaimer">
                  Ainda não há perguntas disponíveis nesta partida.
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
