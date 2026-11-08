import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import { getCycleRanking, getVotingHistory } from './api';
import type { VotingHistoryCycle } from './types';
import './VotingHistory.css';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function VotingHistory({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="history-page">
      <header className="history-heading">
        <span className="gq-kicker">A curiosidade deixa lembranças</span>
        <h1>Resultados e histórico.</h1>
        <p>
          Relembre as votações encerradas, conheça os temas vencedores e
          descubra como cada assunto foi escolhido.
        </p>
      </header>
      {session ? (
        <SignedInHistory key={session.token} />
      ) : (
        <Card className="history-login">
          <h2>As descobertas continuam.</h2>
          <p>Entre na sua conta para consultar os resultados das votações.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para ver resultados
          </Button>
        </Card>
      )}
    </section>
  );
}

function SignedInHistory() {
  const session = useAuthStore((state) => state.session);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const identity = [session?.email, session?.expiresAt];
  const history = useQuery({
    queryKey: ['themes', 'history', page, ...identity],
    queryFn: ({ signal }) => getVotingHistory(page, signal),
    enabled: !!session,
    retry: false,
    networkMode: 'always',
  });

  const selected: VotingHistoryCycle | undefined =
    history.data?.ciclos.find((cycle) => cycle.id === selectedId) ??
    history.data?.ciclos[0];

  const ranking = useQuery({
    queryKey: ['themes', 'history-ranking', selected?.id, ...identity],
    queryFn: ({ signal }) => getCycleRanking(selected!.id, signal),
    enabled: !!session && !!selected,
    retry: false,
    networkMode: 'always',
  });

  return (
    <div className="history-layout">
      <section aria-labelledby="history-list-title">
        <div className="history-section-title">
          <h2 id="history-list-title">Votações encerradas</h2>
          <Button
            variant="outline"
            disabled={history.isPending}
            busy={history.isFetching && !history.isPending}
            loadingLabel="Atualizando…"
            onClick={() => void history.refetch()}
          >
            Atualizar
          </Button>
        </div>
        {history.isPending ? (
          <p role="status">Carregando resultados…</p>
        ) : history.isError ? (
          <Card>
            <Notice
              message={
                history.error instanceof ApiError &&
                history.error.status === 404
                  ? 'O histórico ainda não está disponível nesta versão da API.'
                  : history.error instanceof Error
                    ? history.error.message
                    : 'Não foi possível carregar o histórico.'
              }
            />
            <Button variant="outline" onClick={() => void history.refetch()}>
              Tentar novamente
            </Button>
          </Card>
        ) : history.data.ciclos.length === 0 ? (
          <Card>
            <p>Ainda não há votações encerradas nesta página.</p>
          </Card>
        ) : (
          <ul className="history-list">
            {history.data.ciclos.map((cycle) => (
              <li key={cycle.id}>
                <Card className="history-card">
                  <span className="history-status">Encerrada</span>
                  <h3>{cycle.nome}</h3>
                  <p>
                    Encerrada em{' '}
                    <time dateTime={cycle.encerradoEm}>
                      {formatDate(cycle.encerradoEm)}
                    </time>
                  </p>
                  <p>
                    <strong>Vencedor: </strong>
                    {cycle.vencedorTitulo ?? 'Nenhum tema vencedor'}
                  </p>
                  <p>
                    {cycle.totalVotos}{' '}
                    {cycle.totalVotos === 1
                      ? 'voto registrado'
                      : 'votos registrados'}
                  </p>
                  <Button
                    variant={
                      selected?.id === cycle.id ? 'secondary' : 'outline'
                    }
                    aria-pressed={selected?.id === cycle.id}
                    onClick={() => setSelectedId(cycle.id)}
                  >
                    Ver resultado
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
        {history.isSuccess && (
          <div className="history-pagination">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => {
                setSelectedId(null);
                setPage((value) => Math.max(0, value - 1));
              }}
            >
              Anterior
            </Button>
            <span role="status">
              Página {page + 1} · {history.data.total}{' '}
              {history.data.total === 1 ? 'ciclo' : 'ciclos'}
            </span>
            <Button
              variant="outline"
              disabled={!history.data.temProxima}
              onClick={() => {
                setSelectedId(null);
                setPage((value) => value + 1);
              }}
            >
              Próxima
            </Button>
          </div>
        )}
      </section>
      <section aria-labelledby="history-ranking-title">
        <Card className="history-detail">
          <span className="gq-kicker">Como terminou</span>
          <h2 id="history-ranking-title">Ranking final</h2>
          {!selected ? (
            <p>Selecione uma votação encerrada para ver seu resultado.</p>
          ) : (
            <>
              <p className="history-detail-cycle">{selected.nome}</p>
              <div className="history-winner">
                <span>Tema vencedor</span>
                <strong>{selected.vencedorTitulo ?? 'Sem vencedor'}</strong>
              </div>
              {selected.rankingReconstruido && (
                <p className="history-reconstructed" role="note">
                  Resultado histórico reconstruído a partir dos votos salvos.
                  Temas sem votos e a elegibilidade original podem não estar
                  representados.
                </p>
              )}
              {ranking.isPending ? (
                <p role="status">Consultando o ranking…</p>
              ) : ranking.isError ? (
                <Notice message="Não foi possível consultar o ranking final." />
              ) : ranking.data.length === 0 ? (
                <p>Este ciclo não possui votos ou classificação disponível.</p>
              ) : (
                <ol className="history-results">
                  {ranking.data.map((theme) => (
                    <li key={theme.temaId}>
                      <span className="history-position">{theme.posicao}º</span>
                      <span className="history-result-name">
                        {theme.titulo}
                      </span>
                      <strong>
                        {theme.votos} {theme.votos === 1 ? 'voto' : 'votos'}
                      </strong>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
