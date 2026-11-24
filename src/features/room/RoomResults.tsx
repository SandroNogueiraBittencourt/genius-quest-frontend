import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { ApiError } from '../../services/http';
import { realRoomApi } from './realApi';
import './RoomResults.css';

export function RoomResults({
  codigo,
  partidaId,
  heading: Heading = 'h3',
}: {
  codigo: string;
  partidaId: string;
  heading?: 'h3' | 'h4';
}) {
  const title = useId();
  const auth = useAuthStore((state) => state.session);
  const result = useQuery({
    queryKey: [
      'real-room-result',
      auth?.email,
      auth?.expiresAt,
      codigo,
      partidaId,
    ],
    queryFn: ({ signal }) =>
      realRoomApi.consultarResultado(codigo, partidaId, signal),
    enabled: !!auth,
    retry: false,
    // O resultado concluído é persistido pelo backend, não recalculado na UI.
    staleTime: Infinity,
    refetchOnMount: 'always',
  });

  if (!auth) return null;
  return (
    <section className="room-results" aria-labelledby={title}>
      <Heading id={title}>Classificação final</Heading>
      {result.isPending ? (
        <p role="status">Carregando placar…</p>
      ) : result.isError ? (
        <>
          <Notice
            message={
              result.error instanceof ApiError && result.error.status === 404
                ? 'O placar desta partida não está disponível.'
                : result.error.message
            }
          />
          <Button
            variant="outline"
            busy={result.isFetching}
            loadingLabel="Carregando placar…"
            onClick={() => void result.refetch()}
          >
            Tentar carregar placar novamente
          </Button>
        </>
      ) : result.data.classificacao.length === 0 ? (
        <p>Esta partida terminou sem pontuações registradas.</p>
      ) : (
        <div
          className="room-results-scroll"
          role="region"
          aria-label="Tabela de classificação"
          tabIndex={0}
        >
          <table aria-labelledby={title}>
            <thead>
              <tr>
                <th scope="col">Posição</th>
                <th scope="col">Jogador</th>
                <th scope="col">Pontos</th>
                <th scope="col">Acertos</th>
                <th scope="col">Erros</th>
              </tr>
            </thead>
            <tbody>
              {result.data.classificacao.map((player) => (
                <tr key={player.id}>
                  <td>{player.posicao}º</td>
                  <th scope="row">{player.nome}</th>
                  <td className="room-results-points">{player.pontos}</td>
                  <td>{player.acertos}</td>
                  <td>{player.erros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
