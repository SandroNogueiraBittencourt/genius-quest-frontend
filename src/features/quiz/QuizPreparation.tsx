import { useState } from 'react';
import { Button, Card, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { MatchList } from './MatchList';
import { useMyMatchesPage } from './queries';
import { MatchPagination } from './MatchPagination';
import './QuizPreparation.css';

export function QuizPreparation({
  onSignIn,
  onViewHistory,
  onRealRoom,
  onViewResults,
}: {
  onSignIn: () => void;
  onViewHistory: () => void;
  onRealRoom: () => void;
  onViewResults: () => void;
}) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="quiz-preparation">
      <header className="quiz-preparation-heading">
        <span className="gq-kicker">Cada rodada, uma nova lembrança</span>
        <h1>Minhas partidas.</h1>
        <p>
          Acompanhe as partidas vinculadas à sua conta, da preparação ao
          resultado. Jogue com outras pessoas na Sala real.
        </p>
      </header>
      {session ? (
        <SignedInMatches
          key={session.token}
          onViewHistory={onViewHistory}
          onRealRoom={onRealRoom}
          onViewResults={onViewResults}
        />
      ) : (
        <Card>
          <h2>Entre para consultar suas partidas.</h2>
          <p>As partidas ficam vinculadas à sua conta.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar na minha conta
          </Button>
        </Card>
      )}
    </section>
  );
}

function SignedInMatches({
  onViewHistory,
  onRealRoom,
  onViewResults,
}: {
  onViewHistory: () => void;
  onRealRoom: () => void;
  onViewResults: () => void;
}) {
  const [page, setPage] = useState(0);
  const matches = useMyMatchesPage(page);

  return (
    <>
      <div className="quiz-preparation-toolbar">
        <h2>Histórico de partidas</h2>
        <div className="quiz-preparation-actions">
          <Button variant="outline" onClick={onViewHistory}>
            Ver vencedores
          </Button>
          <Button variant="outline" onClick={onViewResults}>
            Resultados
          </Button>
          <Button variant="secondary" onClick={onRealRoom}>
            Ir para a sala real
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
          <Notice message="Não foi possível consultar as partidas. Verifique sua conexão." />
          <Button variant="outline" onClick={() => void matches.refetch()}>
            Tentar novamente
          </Button>
        </Card>
      ) : matches.data.items.length === 0 ? (
        <Card>
          <h3>
            {page === 0
              ? 'Você ainda não tem partidas.'
              : 'Nenhuma partida nesta página.'}
          </h3>
          <p>
            Participe de uma sala real ou escolha um tema vencedor no Histórico
            de votação para preparar uma partida.
          </p>
          <Button variant="secondary" onClick={onRealRoom}>
            Jogar na sala real
          </Button>
        </Card>
      ) : (
        <MatchList matches={matches.data.items} />
      )}
      <MatchPagination
        page={page}
        totalPages={matches.data?.totalPages ?? 0}
        onPageChange={setPage}
        busy={matches.isFetching}
      />
    </>
  );
}
