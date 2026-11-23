import { useState } from 'react';
import { Button, Card, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import type { PreparedMatch } from './api';
import { useMyMatches } from './queries';
import { RoomResults } from '../room/RoomResults';
import './QuizPreparation.css';

const statusLabels: Record<PreparedMatch['status'], string> = {
  PREPARACAO: 'Em preparação',
  PRONTA: 'Pronta',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

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
        <h1>Minhas partidas</h1>
        <p>Acompanhe as partidas que você criou ou jogou.</p>
      </header>
      {session ? (
        <SignedInMatches key={session.token} onViewHistory={onViewHistory} />
      ) : (
        <Card>
          <h2>Entre para ver suas partidas.</h2>
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
  const matches = useMyMatches();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="quiz-preparation-toolbar">
        <h2>Histórico de partidas</h2>
        <div className="quiz-preparation-actions">
          <Button variant="outline" onClick={onViewHistory}>
            Ver resultados
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
          <h3>Você ainda não tem partidas.</h3>
          <p>Crie uma sala ou entre pelo código de um convite.</p>
          <Button variant="secondary" onClick={onViewHistory}>
            Explorar resultados
          </Button>
        </Card>
      ) : (
        <ul className="quiz-preparation-list">
          {matches.data.map((match) => (
            <li key={match.id}>
              <Card className="quiz-preparation-card">
                <span className="quiz-preparation-status">
                  {statusLabels[match.status]}
                </span>
                <h3>{match.temaTitulo}</h3>
                <p>
                  Categoria: <strong>{match.categoriaNome}</strong>
                </p>
                <p>
                  Origem:{' '}
                  <strong>
                    {match.cicloNome ?? 'Tema escolhido no lobby'}
                  </strong>
                </p>
                <p>
                  <time dateTime={match.criadoEm}>
                    Preparada em{' '}
                    {new Date(match.criadoEm).toLocaleString('pt-BR')}
                  </time>
                </p>
                {match.status === 'CONCLUIDA' && match.codigoSala && (
                  <>
                    <Button
                      variant="outline"
                      aria-expanded={selected === match.id}
                      onClick={() =>
                        setSelected(selected === match.id ? null : match.id)
                      }
                    >
                      {selected === match.id ? 'Ocultar placar' : 'Ver placar'}
                    </Button>
                    {selected === match.id && (
                      <RoomResults
                        codigo={match.codigoSala}
                        partidaId={match.id}
                      />
                    )}
                  </>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
