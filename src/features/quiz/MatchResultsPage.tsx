import { useState } from 'react';
import { Button, Card, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { MatchList } from './MatchList';
import { MatchPagination } from './MatchPagination';
import { MATCH_PAGE_SIZE } from './api';
import { useMyMatches } from './queries';
import './QuizPreparation.css';

export function MatchResultsPage({
  onSignIn,
  onViewMatches,
}: {
  onSignIn: () => void;
  onViewMatches: () => void;
}) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="quiz-preparation">
      <header className="quiz-preparation-heading">
        <span className="gq-kicker">Celebre o que vocês descobriram</span>
        <h1>Resultados</h1>
        <p>
          Consulte a classificação, os pontos, os acertos e os erros das
          partidas multiplayer que você concluiu com sua turma.
        </p>
      </header>
      {session ? (
        <MatchResultsHistory
          key={session.token}
          onViewMatches={onViewMatches}
        />
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

function MatchResultsHistory({ onViewMatches }: { onViewMatches: () => void }) {
  const [requestedPage, setPage] = useState(0);
  const matches = useMyMatches();
  const completed =
    matches.data?.filter(
      (match) => match.status === 'CONCLUIDA' && !!match.codigoSala,
    ) ?? [];
  const totalPages = Math.ceil(completed.length / MATCH_PAGE_SIZE);
  const page = Math.min(requestedPage, Math.max(0, totalPages - 1));
  const start = page * MATCH_PAGE_SIZE;
  return (
    <>
      <div className="quiz-preparation-toolbar">
        <h2>Partidas multiplayer concluídas</h2>
        <div className="quiz-preparation-actions">
          <Button variant="outline" onClick={onViewMatches}>
            Ver todas as minhas partidas
          </Button>
          <Button
            variant="outline"
            disabled={matches.isPending}
            busy={matches.isFetching && !matches.isPending}
            loadingLabel="Atualizando…"
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
          <Notice message={matches.error.message} />
          <Button variant="outline" onClick={() => void matches.refetch()}>
            Tentar carregar partidas novamente
          </Button>
        </Card>
      ) : completed.length === 0 ? (
        <Card>
          <p>Você ainda não tem resultados de partidas multiplayer.</p>
        </Card>
      ) : (
        <MatchList matches={completed.slice(start, start + MATCH_PAGE_SIZE)} />
      )}
      <MatchPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        busy={matches.isFetching}
      />
    </>
  );
}
