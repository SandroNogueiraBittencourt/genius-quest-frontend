import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { useAuthStore } from '../auth/store';
import { getThemes } from '../themes/api';
import { playerIdFromJwt, realRoomApi, validRoomCode } from './realApi';
import './RealRoom.css';

/** Conexão real. A demonstração em memória continua em ?view=lobby. */
export function RealRoom({ onSignIn }: { onSignIn: () => void }) {
  const auth = useAuthStore((s) => s.session);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [entrada, setEntrada] = useState('');
  const [temaId, setTemaId] = useState('');
  const [respondida, setRespondida] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const client = useQueryClient();
  const meuId = auth ? playerIdFromJwt(auth.token) : null;

  const sala = useQuery({
    queryKey: ['real-room', auth?.email, codigo],
    queryFn: ({ signal }) => realRoomApi.consultar(codigo!, signal),
    enabled: Boolean(auth && codigo),
    refetchInterval: 5000,
    retry: false,
  });
  const temas = useQuery({
    queryKey: ['real-room', 'themes', auth?.email],
    queryFn: ({ signal }) => getThemes(signal),
    enabled: Boolean(auth),
    retry: false,
    staleTime: 30_000,
  });
  const votacao = useQuery({
    queryKey: ['real-room', 'votes', auth?.email, codigo],
    queryFn: ({ signal }) => realRoomApi.consultarVotacao(codigo!, signal),
    enabled: Boolean(auth && codigo && sala.data && !sala.data.encerrada &&
      sala.data.status === 'PREPARACAO'),
    refetchInterval: 5000,
    retry: false,
  });
  const pergunta = useQuery({
    queryKey: ['real-room', 'question', auth?.email, codigo],
    queryFn: ({ signal }) => realRoomApi.perguntaAtual(codigo!, signal),
    enabled: Boolean(auth && codigo && sala.data && !sala.data.encerrada &&
      sala.data.status === 'EM_ANDAMENTO'),
    refetchInterval: 5000,
    retry: false,
  });
  const continuacao = useQuery({
    queryKey: ['real-room', 'continuation', auth?.email, codigo, sala.data?.partidaId],
    queryFn: ({ signal }) => realRoomApi.consultarContinuacao(
      codigo!, sala.data!.partidaId!, signal),
    enabled: Boolean(auth && codigo && sala.data?.partidaId &&
      sala.data.status === 'CONCLUIDA' && !sala.data.encerrada),
    refetchInterval: 5000,
    retry: false,
  });
  const room = sala.data;
  const anfitriao = Boolean(room && meuId && room.anfitriaoId === meuId);

  async function executar(acao: () => Promise<unknown>, sair = false) {
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    try {
      await acao();
      if (sair) {
        setCodigo(null);
        setRespondida(null);
      }
      await client.invalidateQueries({ queryKey: ['real-room'] });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao acessar a sala.');
    } finally {
      setOcupado(false);
    }
  }

  if (!auth) {
    return (
      <Card className="real-room-shell">
        <span className="gq-kicker">Multiplayer conectado</span>
        <h1>Sala real do GeniusQuest</h1>
        <p>Entre na sua conta para criar ou participar de uma sala compartilhada entre dispositivos.</p>
        <Button variant="secondary" onClick={onSignIn}>Entrar para jogar</Button>
      </Card>
    );
  }

  return (
    <section className="real-room-shell">
      <header className="real-room-heading">
        <span className="gq-kicker">Multiplayer conectado ao backend</span>
        <h1>Sua turma em uma sala real</h1>
        <p>Compartilhe o código UUID com pessoas que tenham uma conta. Atualização automática a cada 5 segundos.</p>
      </header>
      {erro && <Notice message={erro} />}
      {!codigo ? (
        <Card>
          <h2>Criar ou entrar</h2>
          <div className="real-room-actions">
            <Button variant="secondary" busy={ocupado}
              onClick={() => void executar(async () => {
                const nova = await realRoomApi.criar();
                setCodigo(nova.codigo);
              })}>
              Criar sala real
            </Button>
          </div>
          <form onSubmit={(event) => {
            event.preventDefault();
            void executar(async () => {
              const id = validRoomCode(entrada);
              const existente = await realRoomApi.entrar(id);
              setCodigo(existente.codigo);
            });
          }} className="real-room-form">
            <label htmlFor="real-room-code">Código completo (UUID)</label>
            <input id="real-room-code" value={entrada}
              onChange={(event) => setEntrada(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required
              autoComplete="off" spellCheck={false} />
            <Button variant="outline" type="submit" disabled={ocupado}>Entrar na sala</Button>
          </form>
          <p>As salas demonstrativas usam outro código e não são compartilhadas entre dispositivos.</p>
        </Card>
      ) : (
        <>
          <Card>
            <h2>Lobby: {codigo}</h2>
            <div className="real-room-actions">
              <Button variant="outline" onClick={() => {
                void navigator.clipboard?.writeText(codigo).catch(() => setErro('Copie o código manualmente.'));
              }}>Copiar código</Button>
              <Button variant="outline" onClick={() => void sala.refetch()} disabled={ocupado}>Atualizar sala</Button>
              <Button variant="outline" disabled={ocupado}
                onClick={() => void executar(() => realRoomApi.sair(codigo), true)}>
                Sair da sala
              </Button>
            </div>
            {sala.isPending && <p role="status">Consultando participantes…</p>}
            {sala.isError && <Notice message={sala.error.message} />}
            {room && (
              <>
                <p role="status">Estado: <strong>{room.status}</strong>
                  {room.encerrada ? ' — Sala encerrada' : ''}</p>
                <ul className="real-room-players">
                  {room.participantes.map((p) =>
                    <li key={p.id}>{p.nome}
                      {p.id === room.anfitriaoId ? ' (anfitrião)' : ''}
                      {p.id === meuId ? ' — você' : ''}
                    </li>)}
                </ul>
                {anfitriao && !room.encerrada && (
                  <Button variant="outline" disabled={ocupado}
                    onClick={() => void executar(() => realRoomApi.fechar(codigo))}>
                    Encerrar sala para todos
                  </Button>
                )}
                {room.encerrada && (
                  <Button variant="secondary" onClick={() => setCodigo(null)}>
                    Criar ou entrar em outra sala
                  </Button>
                )}
              </>
            )}
          </Card>
          {room && !room.encerrada && room.status === 'PREPARACAO' && (
            <Card>
              <h2>Escolha do tema</h2>
              {temas.isPending && <p>Carregando temas aprovados…</p>}
              {temas.isError && <Notice message={temas.error.message} />}
              <label htmlFor="real-room-theme">Tema aprovado</label>
              <select id="real-room-theme" value={temaId}
                onChange={(e) => setTemaId(e.target.value)}>
                <option value="">Selecione um tema</option>
                {temas.data?.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
              </select>
              {votacao.isError && <Notice message={votacao.error.message} />}
              {room.temaId ? (
                <p>Tema escolhido: {temas.data?.find(t => t.id === room.temaId)?.titulo ?? room.temaId}.
                   Para iniciar, o tema precisa ter ao menos 10 perguntas aprovadas e válidas.</p>
              ) : (
                <>
                  {anfitriao && !votacao.data?.aberta && (
                    <div className="real-room-actions">
                      <Button disabled={!temaId || ocupado}
                        onClick={() => void executar(() => realRoomApi.escolherTema(codigo, temaId))}>
                        Escolher tema diretamente
                      </Button>
                      <Button variant="outline" disabled={ocupado}
                        onClick={() => void executar(() => realRoomApi.abrirVotacao(codigo))}>
                        Abrir votação
                      </Button>
                    </div>
                  )}
                  {votacao.data?.aberta && (
                    <>
                      <p>Votação aberta. Todos os participantes podem votar.</p>
                      <Button disabled={!temaId || ocupado}
                        onClick={() => void executar(() => realRoomApi.votar(codigo, temaId))}>
                        Votar neste tema
                      </Button>
                      <ul>{votacao.data.totais.map(v =>
                        <li key={v.temaId}>
                          {temas.data?.find(t => t.id === v.temaId)?.titulo ?? v.temaId}: {v.votos} voto(s)
                        </li>)}</ul>
                      {anfitriao && (
                        <Button variant="secondary" disabled={ocupado}
                          onClick={() => void executar(() =>
                            realRoomApi.encerrarVotacao(codigo, temaId || undefined))}>
                          Encerrar votação (tema selecionado desempata)
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
              {anfitriao && room.partidaId && (
                <div className="real-room-actions">
                  <Button variant="secondary" disabled={ocupado}
                    onClick={() => void executar(() => realRoomApi.iniciar(codigo))}>
                    Iniciar partida
                  </Button>
                </div>
              )}
            </Card>
          )}
          {room && !room.encerrada && room.status === 'EM_ANDAMENTO' && (
            <Card>
              <h2>Pergunta da partida</h2>
              {pergunta.isPending && <p role="status">Carregando pergunta…</p>}
              {pergunta.isError && <Notice message={pergunta.error.message} />}
              {pergunta.data && (
                <>
                  <p>Pergunta {pergunta.data.numero} de {pergunta.data.totalPerguntas}</p>
                  <h3>{pergunta.data.enunciado}</h3>
                  {respondida === pergunta.data.numero ? (
                    <p role="status">Resposta registrada. Aguardando os outros participantes…</p>
                  ) : (
                    <div className="real-room-answers">
                      {pergunta.data.alternativas.map((texto, indice) =>
                        <Button key={indice} variant="outline" disabled={ocupado}
                          onClick={() => void executar(async () => {
                            await realRoomApi.responder(codigo, pergunta.data!.numero, indice);
                            setRespondida(pergunta.data!.numero);
                          })}>
                          {String.fromCharCode(65 + indice)}. {texto}
                        </Button>)}
                    </div>
                  )}
                </>
              )}
            </Card>
          )}
          {room && !room.encerrada && room.status === 'CONCLUIDA' && room.partidaId && (
            <Card>
              <h2>Partida concluída!</h2>
              <p>Vocês querem continuar e votar em outro tema?</p>
              {continuacao.isPending && <p>Consultando votos…</p>}
              {continuacao.isError && <Notice message={continuacao.error.message} />}
              {continuacao.data && (
                <p role="status">Continuação: {continuacao.data.status} — {continuacao.data.favoraveis} sim,
                  {continuacao.data.contrarios} não.</p>
              )}
              {continuacao.data?.status === 'AGUARDANDO' && (
                <div className="real-room-actions">
                  <Button disabled={ocupado} onClick={() => void executar(() =>
                    realRoomApi.votarContinuacao(codigo, room.partidaId!, true))}>Sim, continuar</Button>
                  <Button variant="outline" disabled={ocupado} onClick={() => void executar(() =>
                    realRoomApi.votarContinuacao(codigo, room.partidaId!, false))}>Não, encerrar rodada</Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </section>
  );
}
