import { useId, useState } from 'react';
import { Button, Card } from '../../components/ui';
import { RoomResults } from '../room/RoomResults';
import type { PreparedMatch } from './api';
import './QuizPreparation.css';

const statusLabels: Record<PreparedMatch['status'], string> = {
  PREPARACAO: 'Em preparação',
  PRONTA: 'Pronta',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export function MatchList({ matches }: { matches: PreparedMatch[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const listId = useId();
  return (
    <ul className="quiz-preparation-list">
      {matches.map((match) => {
        const canShowResult =
          match.status === 'CONCLUIDA' && !!match.codigoSala;
        const expanded = canShowResult && selected === match.id;
        const resultId = listId + '-' + match.id;
        return (
          <li key={match.id} className={expanded ? 'is-expanded' : undefined}>
            <Card className="quiz-preparation-card">
              <span className="quiz-preparation-status">
                {statusLabels[match.status]}
              </span>
              <h3>{match.temaTitulo}</h3>
              <p>
                Categoria: <strong>{match.categoriaNome}</strong>
              </p>
              <p>
                Modo:{' '}
                <strong>{match.codigoSala ? 'Sala real' : 'Individual'}</strong>
              </p>
              <p>
                Origem:{' '}
                <strong>
                  {match.cicloNome ?? 'Tema escolhido na sala real'}
                </strong>
              </p>
              <p>
                Criada em{' '}
                <time dateTime={match.criadoEm}>
                  {new Date(match.criadoEm).toLocaleString('pt-BR')}
                </time>
              </p>
              {!match.codigoSala && match.status === 'PREPARACAO' && (
                <p className="quiz-preparation-disclaimer">
                  Ainda não há perguntas disponíveis nesta partida.
                </p>
              )}
              {canShowResult && (
                <>
                  <Button
                    variant="outline"
                    aria-expanded={expanded}
                    aria-controls={resultId}
                    onClick={() => setSelected(expanded ? null : match.id)}
                  >
                    {expanded ? 'Ocultar placar' : 'Ver placar'}
                  </Button>
                  <div id={resultId} hidden={!expanded}>
                    {expanded && match.codigoSala && (
                      <RoomResults
                        codigo={match.codigoSala}
                        partidaId={match.id}
                        heading="h4"
                      />
                    )}
                  </div>
                </>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
