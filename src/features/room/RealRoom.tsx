import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import { getThemes } from '../themes/api';
import { playerIdFromJwt, realRoomApi, validRoomCode } from './realApi';
import { RoomResults } from './RoomResults';
import { RoomInvite } from './RoomInvitePanel';
import { clearRoomInvite, readRoomInvite } from './roomInvite';
import { forgetRoomCode, readRoomCode, rememberRoomCode } from './savedRoom';
import './RealRoom.css';

/** Conexão real. A demonstração em memória continua em ?view=lobby. */
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 14;

export function RealRoom({
  onSignIn,
  onViewResults,
}: {
  onSignIn: () => void;
  onViewResults: () => void;
}) {
  const auth = useAuthStore((s) => s.session);
  // Só o UUID da sala é guardado nesta aba, associado ao UUID do usuário.
  // Nunca persistir JWT ou dados de autenticação no storage.
  const [selecionada, setSelecionada] = useState<{
    jogadorId: string;
    codigo: string;
  } | null>(null);
  const convite = readRoomInvite();
  const [entrada, setEntrada] = useState(() => convite ?? '');
  const [escolhaTema, setEscolhaTema] = useState({
    fase: '',
    abertaEm: 0,
    temaId: '',
  });
  const [ocupado, setOcupado] = useState(false);
  const acaoEmCurso = useRef(false);
  const [erro, setErro] = useState('');
  const client = useQueryClient();
  const meuId = auth ? playerIdFromJwt(auth.token) : null;
  const identity = [auth?.email, auth?.expiresAt];
  const codigo =
    selecionada?.jogadorId === meuId && meuId
      ? selecionada.codigo
      : readRoomCode(meuId);

  function setCodigo(novo: string | null) {
    if (novo) rememberRoomCode(meuId, novo);
    else forgetRoomCode(meuId);
    setSelecionada(meuId && novo ? { jogadorId: meuId, codigo: novo } : null);
  }

  const sala = useQuery({
    queryKey: ['real-room', ...identity, codigo],
    queryFn: ({ signal }) => realRoomApi.consultar(codigo!, signal),
    enabled: Boolean(auth && codigo),
    refetchInterval: 5000,
    staleTime: 0,
    retry: false,
  });
  const room = sala.isError ? undefined : sala.data;
  const faseTema = JSON.stringify([
    meuId,
    codigo,
    room?.status,
    room?.partidaId,
  ]);
  if (escolhaTema.fase !== faseTema) {
    setEscolhaTema({
      fase: faseTema,
      abertaEm: sala.dataUpdatedAt,
      temaId: '',
    });
  }
  const { temaId } = escolhaTema;
  const temas = useQuery({
    queryKey: ['real-room', 'themes', ...identity],
    queryFn: ({ signal }) => getThemes(signal),
    enabled: Boolean(auth),
    retry: false,
    staleTime: 30_000,
  });
  const votacao = useQuery({
    // A nova rodada pode repetir o UUID da sala e ter partidaId nulo novamente.
    queryKey: [
      'real-room',
      'votes',
      ...identity,
      codigo,
      faseTema,
      escolhaTema.abertaEm,
    ],
    queryFn: ({ signal }) => realRoomApi.consultarVotacao(codigo!, signal),
    enabled: Boolean(
      auth && codigo && room && !room.encerrada && room.status === 'PREPARACAO',
    ),
    refetchInterval: 5000,
    staleTime: 0,
    retry: false,
  });
  const perguntaKey = [
    'real-room',
    'question',
    ...identity,
    codigo,
    room?.partidaId,
  ];
  const pergunta = useQuery({
    queryKey: perguntaKey,
    queryFn: ({ signal }) => realRoomApi.perguntaAtual(codigo!, signal),
    enabled: Boolean(
      auth &&
      codigo &&
      room?.partidaId &&
      !room.encerrada &&
      room.status === 'EM_ANDAMENTO',
    ),
    staleTime: 0,
    retry: false,
  });
  const continuationKey = [
    'real-room',
    'continuation',
    ...identity,
    codigo,
    room?.partidaId,
  ];
  const continuacao = useQuery({
    queryKey: continuationKey,
    queryFn: ({ signal }) =>
      realRoomApi.consultarContinuacao(codigo!, room!.partidaId!, signal),
    enabled: Boolean(
      auth &&
      codigo &&
      room?.partidaId &&
      room.status === 'CONCLUIDA' &&
      !room.encerrada,
    ),
    refetchInterval: (query) =>
      query.state.data?.status === 'ENCERRADA' ||
      query.state.data?.status === 'APROVADA'
        ? false
        : 5000,
    staleTime: 0,
    retry: false,
  });
  const questao =
    !pergunta.isError && pergunta.data?.partidaId === room?.partidaId
      ? pergunta.data
      : undefined;
  const estadoContinuacao = continuacao.isError ? undefined : continuacao.data;
  const anfitriao = Boolean(room && meuId && room.anfitriaoId === meuId);
  const totalJogadores = room?.participantes.length ?? 0;
  const faltamJogadores = totalJogadores < MIN_PLAYERS;

  async function executar(
    acao: () => Promise<unknown>,
    { sair = false, atualizar = true } = {},
  ) {
    if (acaoEmCurso.current) return;
    acaoEmCurso.current = true;
    setOcupado(true);
    setErro('');
    try {
      await acao();
      if (sair) {
        setCodigo(null);
      }
      if (atualizar) {
        await client.invalidateQueries({ queryKey: ['real-room'] });
        await client.invalidateQueries({ queryKey: ['quiz', 'my-matches'] });
      }
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Falha ao acessar a sala.',
      );
    } finally {
      acaoEmCurso.current = false;
      setOcupado(false);
    }
  }

  async function responder(indice: number) {
    if (!codigo || !questao) return;
    await executar(
      async () => {
        const query = { queryKey: perguntaKey, exact: true };
        const resposta = await realRoomApi
          .responder(codigo, questao.numero, indice)
          .catch((error: unknown) => {
            if (useAuthStore.getState().session === auth)
              void pergunta.refetch();
            throw error;
          });
        await client.cancelQueries(query);
        if (useAuthStore.getState().session !== auth) return;
        client.setQueryData(perguntaKey, resposta.proximaPergunta);
        if (resposta.status === 'CONCLUIDA') {
          void sala.refetch();
          void client.invalidateQueries({ queryKey: ['quiz', 'my-matches'] });
        }
      },
      { atualizar: false },
    );
  }

  async function votarContinuacao(continuar: boolean) {
    if (!codigo || !room?.partidaId) return;
    const partidaId = room.partidaId;
    function conferirSessao() {
      if (useAuthStore.getState().session !== auth)
        throw new DOMException('Sessão alterada.', 'AbortError');
    }
    await executar(async () => {
      await client.cancelQueries({ queryKey: continuationKey, exact: true });
      conferirSessao();
      try {
        const atual = await realRoomApi.votarContinuacao(
          codigo,
          partidaId,
          continuar,
        );
        conferirSessao();
        client.setQueryData(continuationKey, atual);
      } catch (error) {
        // Outro jogador pode ter decidido a rodada entre a consulta e o voto.
        // Só tratamos o conflito como estado normal se a API o confirmar.
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
        conferirSessao();
        const atual = await realRoomApi.consultarContinuacao(codigo, partidaId);
        conferirSessao();
        client.setQueryData(continuationKey, atual);
        if (atual.status === 'AGUARDANDO' && atual.meuVoto === null)
          throw error;
      }
    });
  }

  if (!auth) {
    return (
      <Card className="real-room-shell">
        <span className="gq-kicker">Multiplayer conectado</span>
        <h1>Sala real do GeniusQuest</h1>
        <p>
          Entre na sua conta para criar ou participar de uma sala compartilhada
          entre dispositivos.
        </p>
        {convite && (
          <p role="status">
            Convite recebido. Entre na sua conta para participar da sala.
          </p>
        )}
        <Button variant="secondary" onClick={onSignIn}>
          Entrar para jogar
        </Button>
      </Card>
    );
  }

  return (
    <section className="real-room-shell">
      <header className="real-room-heading">
        <span className="gq-kicker">Multiplayer conectado ao backend</span>
        <h1>Sua turma em uma sala real</h1>
        <p>
          Compartilhe o QR Code, o link ou o código UUID com pessoas que tenham
          uma conta. Atualização automática a cada 5 segundos.
        </p>
      </header>
      {erro && <Notice message={erro} />}
      {!codigo ? (
        <Card>
          <h2>{convite ? 'Convite recebido' : 'Criar ou entrar'}</h2>
          {convite && <p>Confirme a entrada na sala compartilhada.</p>}
          {new URLSearchParams(window.location.search).has('room') &&
            !convite && (
              <Notice message="Link de convite inválido. Informe um código de sala válido." />
            )}
          <div className="real-room-actions">
            <Button
              variant="secondary"
              busy={ocupado}
              onClick={() =>
                void executar(async () => {
                  const nova = await realRoomApi.criar();
                  clearRoomInvite();
                  setEntrada('');
                  setCodigo(nova.codigo);
                })
              }
            >
              Criar sala real
            </Button>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void executar(async () => {
                const id = validRoomCode(entrada);
                const existente = await realRoomApi.entrar(id);
                clearRoomInvite();
                setEntrada('');
                setCodigo(existente.codigo);
              });
            }}
            className="real-room-form"
          >
            <label htmlFor="real-room-code">Código completo (UUID)</label>
            <input
              id="real-room-code"
              value={entrada}
              onChange={(event) => setEntrada(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              autoComplete="off"
              spellCheck={false}
            />
            <Button variant="outline" type="submit" disabled={ocupado}>
              Entrar na sala
            </Button>
          </form>
          <p>
            As salas demonstrativas usam outro código e não são compartilhadas
            entre dispositivos.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <h2>Lobby: {codigo}</h2>
            {convite && convite !== codigo && (
              <Notice message="Você já está em uma sala. Saia dela antes de entrar na sala do convite." />
            )}
            <div className="real-room-actions">
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(codigo)
                    .catch(() => setErro('Copie o código manualmente.'));
                }}
              >
                Copiar código
              </Button>
              <Button
                variant="outline"
                onClick={() => void sala.refetch()}
                disabled={ocupado}
              >
                Atualizar sala
              </Button>
              <Button
                variant="outline"
                disabled={ocupado}
                onClick={() =>
                  void executar(() => realRoomApi.sair(codigo), { sair: true })
                }
              >
                Sair da sala
              </Button>
              <Button variant="outline" onClick={onViewResults}>
                Meus resultados
              </Button>
            </div>
            {room && !room.encerrada && room.status === 'PREPARACAO' && (
              <RoomInvite key={codigo} code={codigo} />
            )}
            {sala.isPending && <p role="status">Consultando participantes…</p>}
            {sala.isError && (
              <>
                <Notice message={sala.error.message} />
                <Button variant="outline" onClick={() => setCodigo(null)}>
                  Esquecer esta sala e entrar em outra
                </Button>
              </>
            )}
            {room && (
              <>
                <p role="status">
                  Estado: <strong>{room.status}</strong>
                  {room.encerrada ? ' — Sala encerrada' : ''}
                </p>
                {!room.encerrada && room.status === 'PREPARACAO' && (
                  <p role="status" id="real-room-occupancy">
                    {totalJogadores} de {MAX_PLAYERS} jogadores
                    {faltamJogadores &&
                      ' · Aguardando mais 1 jogador para iniciar'}
                    {totalJogadores >= MAX_PLAYERS && ' · Sala cheia'}
                  </p>
                )}
                <ul className="real-room-players">
                  {room.participantes.map((p) => (
                    <li key={p.id}>
                      {p.nome}
                      {p.id === room.anfitriaoId ? ' (anfitrião)' : ''}
                      {p.id === meuId ? ' — você' : ''}
                    </li>
                  ))}
                </ul>
                {anfitriao && !room.encerrada && (
                  <Button
                    variant="outline"
                    disabled={ocupado}
                    onClick={() =>
                      void executar(() => realRoomApi.fechar(codigo))
                    }
                  >
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
            <Card className="real-room-theme">
              <h2>Escolha do tema</h2>
              {temas.isPending && <p>Carregando temas aprovados…</p>}
              {temas.isError && <Notice message={temas.error.message} />}
              {!room.temaId && (
                <div className="real-room-theme-picker">
                  <label htmlFor="real-room-theme">Tema aprovado</label>
                  <select
                    id="real-room-theme"
                    value={temaId}
                    onChange={(event) =>
                      setEscolhaTema({
                        ...escolhaTema,
                        temaId: event.target.value,
                      })
                    }
                  >
                    <option value="">Selecione um tema</option>
                    {temas.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {votacao.isError && <Notice message={votacao.error.message} />}
              {room.temaId ? (
                <p>
                  Tema escolhido:{' '}
                  {temas.data?.find((t) => t.id === room.temaId)?.titulo ??
                    room.temaId}
                  . Para iniciar, o tema precisa ter ao menos 10 perguntas
                  aprovadas e válidas.
                </p>
              ) : (
                <>
                  {anfitriao && votacao.data?.aberta === false && (
                    <div className="real-room-actions">
                      <Button
                        disabled={!temaId || ocupado}
                        onClick={() =>
                          void executar(() =>
                            realRoomApi.escolherTema(codigo, temaId),
                          )
                        }
                      >
                        Escolher tema diretamente
                      </Button>
                      <Button
                        variant="outline"
                        disabled={ocupado}
                        onClick={() =>
                          void executar(() => realRoomApi.abrirVotacao(codigo))
                        }
                      >
                        Abrir votação
                      </Button>
                    </div>
                  )}
                  {votacao.data?.aberta && (
                    <>
                      <p>Votação aberta. Todos os participantes podem votar.</p>
                      <Button
                        disabled={!temaId || ocupado}
                        onClick={() =>
                          void executar(() => realRoomApi.votar(codigo, temaId))
                        }
                      >
                        Votar neste tema
                      </Button>
                      <ul>
                        {votacao.data.totais.map((v) => (
                          <li key={v.temaId}>
                            {temas.data?.find((t) => t.id === v.temaId)
                              ?.titulo ?? v.temaId}
                            : {v.votos} voto(s)
                          </li>
                        ))}
                      </ul>
                      {anfitriao && (
                        <Button
                          variant="secondary"
                          disabled={ocupado}
                          onClick={() =>
                            void executar(() =>
                              realRoomApi.encerrarVotacao(
                                codigo,
                                temaId || undefined,
                              ),
                            )
                          }
                        >
                          Encerrar votação (tema selecionado desempata)
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
              {anfitriao && room.partidaId && (
                <div className="real-room-actions">
                  <Button
                    variant="secondary"
                    disabled={ocupado || faltamJogadores}
                    aria-describedby={
                      faltamJogadores ? 'real-room-occupancy' : undefined
                    }
                    onClick={() =>
                      void executar(() => realRoomApi.iniciar(codigo))
                    }
                  >
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
              {pergunta.isError && (
                <>
                  <Notice message={pergunta.error.message} />
                  <Button
                    variant="outline"
                    busy={pergunta.isFetching}
                    onClick={() => void pergunta.refetch()}
                  >
                    Tentar consultar pergunta novamente
                  </Button>
                </>
              )}
              {!questao && !pergunta.isPending && !pergunta.isError && (
                <p role="status">
                  {pergunta.data === null
                    ? 'Você terminou! Aguardando os outros jogadores para ver o resultado.'
                    : 'Atualizando partida…'}
                </p>
              )}
              {questao && (
                <>
                  <p>
                    Pergunta {questao.numero} de {questao.totalPerguntas}
                  </p>
                  <h3>{questao.enunciado}</h3>
                  <div className="real-room-answers">
                    {questao.alternativas.map((texto, indice) => (
                      <Button
                        key={indice}
                        variant="outline"
                        disabled={ocupado}
                        onClick={() => void responder(indice)}
                      >
                        {String.fromCharCode(65 + indice)}. {texto}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
          {room && room.status === 'CONCLUIDA' && room.partidaId && (
            <Card>
              <h2>Partida concluída!</h2>
              <RoomResults codigo={codigo} partidaId={room.partidaId} />
              {!room.encerrada && (
                <>
                  {continuacao.isPending && (
                    <p role="status">Consultando votos…</p>
                  )}
                  {continuacao.isError && (
                    <>
                      <Notice message={continuacao.error.message} />
                      <Button
                        variant="outline"
                        busy={continuacao.isFetching}
                        onClick={() => void continuacao.refetch()}
                      >
                        Tentar consultar votos novamente
                      </Button>
                    </>
                  )}
                  {estadoContinuacao && (
                    <p role="status">
                      Continuação: {estadoContinuacao.favoraveis} sim,{' '}
                      {estadoContinuacao.contrarios} não.
                    </p>
                  )}
                  {estadoContinuacao?.status === 'AGUARDANDO' && (
                    <>
                      <h3>Vocês querem continuar e votar em outro tema?</h3>
                      {estadoContinuacao.meuVoto === null ? (
                        <div className="real-room-actions">
                          <Button
                            disabled={ocupado}
                            onClick={() => void votarContinuacao(true)}
                          >
                            Sim, continuar
                          </Button>
                          <Button
                            variant="outline"
                            disabled={ocupado}
                            onClick={() => void votarContinuacao(false)}
                          >
                            Não, encerrar rodada
                          </Button>
                        </div>
                      ) : (
                        <p role="status">
                          Seu voto foi registrado. Aguardando os outros
                          participantes…
                        </p>
                      )}
                    </>
                  )}
                  {estadoContinuacao?.status === 'ENCERRADA' && (
                    <p role="status">
                      Votação encerrada. A turma não continuará para outra
                      rodada.
                    </p>
                  )}
                  {estadoContinuacao?.status === 'APROVADA' && (
                    <p role="status">
                      Nova rodada aprovada. Atualizando a sala…
                    </p>
                  )}
                </>
              )}
              <div className="real-room-actions">
                <Button variant="secondary" onClick={onViewResults}>
                  Ver histórico de resultados
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
