import { useQuery } from '@tanstack/react-query';
import { Button, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { getRoomResult } from './api';

export function RoomResults({
  codigo,
  partidaId,
}: {
  codigo: string;
  partidaId: string;
}) {
  const auth = useAuthStore((state) => state.session);
  const result = useQuery({
    queryKey: [
      'room',
      'result',
      auth?.email,
      auth?.expiresAt,
      codigo,
      partidaId,
    ],
    queryFn: ({ signal }) => getRoomResult(codigo, partidaId, signal),
    enabled: !!auth,
    retry: false,
    staleTime: Infinity,
  });

  return (
    <section className="room-results" aria-labelledby="room-results-title">
      <h3 id="room-results-title">Classificação final</h3>
      {result.isPending && <p role="status">Carregando placar…</p>}
      {result.error && (
        <>
          <Notice message={result.error.message} />
          <Button
            variant="outline"
            onClick={() => void result.refetch()}
            busy={result.isFetching}
          >
            Tentar carregar placar novamente
          </Button>
        </>
      )}
      {result.data?.classificacao.length === 0 && (
        <p>Esta partida terminou sem pontuações registradas.</p>
      )}
      {!!result.data?.classificacao.length && (
        <div className="room-results-scroll">
          <table aria-labelledby="room-results-title">
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
