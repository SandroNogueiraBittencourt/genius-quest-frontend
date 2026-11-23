import { useState } from 'react';
import { Button, Card, Notice } from '../../components/ui';
import { RoomResults } from '../room/RoomResults';
import { useMyMatches } from './queries';

export function MatchResultsHistory() {
  const [selected, setSelected] = useState<string | null>(null);
  const matches = useMyMatches();
  const completed =
    matches.data?.filter(
      (match) => match.status === 'CONCLUIDA' && match.codigoSala,
    ) ?? [];

  return (
    <Card
      className="history-match-results"
      role="region"
      aria-labelledby="match-results-title"
    >
      <h2 id="match-results-title">Resultados das partidas</h2>
      {matches.isPending && <p role="status">Consultando suas partidas…</p>}
      {matches.isError && (
        <>
          <Notice message={matches.error.message} />
          <Button variant="outline" onClick={() => void matches.refetch()}>
            Tentar carregar partidas novamente
          </Button>
        </>
      )}
      {matches.isSuccess && !completed.length && (
        <p>Você ainda não tem resultados de partidas multiplayer.</p>
      )}
      {!!completed.length && (
        <ul className="quiz-preparation-list">
          {completed.map((match) => (
            <li key={match.id}>
              <h3>{match.temaTitulo}</h3>
              <time dateTime={match.criadoEm}>
                {new Date(match.criadoEm).toLocaleString('pt-BR')}
              </time>
              <Button
                variant="outline"
                aria-expanded={selected === match.id}
                onClick={() =>
                  setSelected(selected === match.id ? null : match.id)
                }
              >
                {selected === match.id ? 'Ocultar placar' : 'Ver placar'}
              </Button>
              {selected === match.id && match.codigoSala && (
                <RoomResults codigo={match.codigoSala} partidaId={match.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
