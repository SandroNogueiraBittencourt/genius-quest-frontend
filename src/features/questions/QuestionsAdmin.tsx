import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import { hasAdminClaim } from '../categories/permissions';
import {
  decideQuestion,
  getManagedQuestion,
  getQuestionHistory,
  listManagedQuestions,
  reviewQuestion,
} from './api';
import type {
  ManagedQuestion,
  QuestionDecision,
  QuestionDifficulty,
  QuestionReview,
  QuestionStatus,
} from './types';
import './QuestionsAdmin.css';

const statuses: Record<QuestionStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  BLOQUEADA: 'Bloqueada',
};

const decisionNames: Record<QuestionDecision, string> = {
  APROVAR: 'Aprovar',
  REJEITAR: 'Rejeitar',
  BLOQUEAR: 'Bloquear',
};

export function QuestionsAdmin({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <section
      className="questions-admin"
      aria-labelledby="questions-admin-title"
    >
      <header className="questions-admin-heading">
        <span className="gq-kicker">Curadoria responsável</span>
        <h1 id="questions-admin-title">Moderação de perguntas.</h1>
        <p>Revise questões candidatas antes de incluí-las em um quiz.</p>
      </header>
      {!session ? (
        <Card>
          <p>Entre com uma conta administradora para acessar esta área.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para moderar
          </Button>
        </Card>
      ) : !hasAdminClaim(session.token) ? (
        <Card>
          <Notice message="Acesso restrito a administradores." />
        </Card>
      ) : (
        <AdminPanel key={session.token} />
      )}
    </section>
  );
}

function AdminPanel() {
  const session = useAuthStore((state) => state.session);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<QuestionStatus | 'TODAS'>('PENDENTE');
  const [temaId, setTemaId] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [decision, setDecision] = useState<QuestionDecision | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const mutationController = useRef<AbortController | null>(null);
  useEffect(() => () => mutationController.current?.abort(), []);

  const identity = [session?.email, session?.expiresAt];
  const list = useQuery({
    queryKey: ['questions-admin', ...identity, status, temaId, page],
    queryFn: ({ signal }) =>
      listManagedQuestions({ status, temaId, page, size: 10 }, signal),
    enabled: !!session,
    retry: false,
    refetchOnReconnect: false,
  });
  const detail = useQuery({
    queryKey: ['question-admin-detail', ...identity, selectedId],
    queryFn: ({ signal }) => getManagedQuestion(selectedId!, signal),
    enabled: !!session && !!selectedId,
    retry: false,
    refetchOnReconnect: false,
  });
  const history = useQuery({
    queryKey: ['question-admin-history', ...identity, selectedId],
    queryFn: ({ signal }) => getQuestionHistory(selectedId!, signal),
    enabled: !!session && !!selectedId && showHistory,
    retry: false,
    refetchOnReconnect: false,
  });

  function select(id: string) {
    if (busy) return;
    setSelectedId(id);
    setEditing(false);
    setShowHistory(false);
    setDecision(null);
    setReason('');
    setError('');
    setMessage('');
  }

  function updateFilter(next: QuestionStatus | 'TODAS') {
    setStatus(next);
    setPage(0);
    setSelectedId(null);
    setEditing(false);
    setShowHistory(false);
    setError('');
  }

  async function mutate(
    run: (signal: AbortSignal) => Promise<ManagedQuestion>,
    success: string,
  ) {
    if (busy || mutationController.current) return;
    const controller = new AbortController();
    mutationController.current = controller;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await run(controller.signal);
      if (controller.signal.aborted) return;
      setMessage(success);
      setEditing(false);
      setDecision(null);
      setReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questions-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['question-admin-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['question-admin-history'] }),
      ]);
    } catch (cause) {
      if (
        controller.signal.aborted ||
        (cause instanceof DOMException && cause.name === 'AbortError')
      )
        return;
      setError(
        cause instanceof ApiError && cause.status === 403
          ? 'Sua conta não tem permissão para moderar perguntas.'
          : cause instanceof ApiError && [400, 409, 422].includes(cause.status)
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : 'Não foi possível atualizar a pergunta.',
      );
    } finally {
      if (mutationController.current === controller)
        mutationController.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function confirmDecision() {
    if (!selectedId || !decision || !detail.data) return;
    if (decision !== 'APROVAR' && !reason.trim()) {
      setError('Informe o motivo da rejeição ou bloqueio.');
      return;
    }
    if (reason.length > 500) {
      setError('O motivo deve ter até 500 caracteres.');
      return;
    }
    void mutate(
      (signal) => decideQuestion(selectedId, decision, reason, signal),
      'Decisão registrada: ' + decisionNames[decision] + '.',
    );
  }

  const forbidden = list.error instanceof ApiError && list.error.status === 403;
  const question = detail.data;
  return (
    <div className="questions-admin-body">
      <p className="questions-admin-security">
        A autorização é verificada pelo servidor. O gabarito desta página é
        confidencial e destinado somente à curadoria.
      </p>
      {error && <Notice message={error} />}
      {message && (
        <p className="questions-admin-success" role="status">
          {message}
        </p>
      )}
      <div className="questions-admin-layout">
        <section aria-labelledby="questions-list-title">
          <div className="questions-admin-toolbar">
            <h2 id="questions-list-title">Fila de revisão</h2>
            <Button
              variant="outline"
              onClick={() => void list.refetch()}
              disabled={busy || list.isFetching}
            >
              Atualizar
            </Button>
          </div>
          <div className="questions-admin-filters">
            <label htmlFor="question-status-filter">Situação</label>
            <select
              id="question-status-filter"
              value={status}
              disabled={busy}
              onChange={(event) =>
                updateFilter(event.target.value as QuestionStatus | 'TODAS')
              }
            >
              <option value="PENDENTE">Pendentes</option>
              <option value="APROVADA">Aprovadas</option>
              <option value="REJEITADA">Rejeitadas</option>
              <option value="BLOQUEADA">Bloqueadas</option>
              <option value="TODAS">Todas</option>
            </select>
            <Input
              label="Filtrar por ID do tema (opcional)"
              value={temaId}
              disabled={busy}
              onChange={(event) => {
                setTemaId(event.target.value);
                setPage(0);
                setSelectedId(null);
                setShowHistory(false);
              }}
              placeholder="UUID do tema"
            />
          </div>
          {list.isPending ? (
            <p role="status">Consultando perguntas…</p>
          ) : list.isError ? (
            <Card>
              <Notice
                message={
                  forbidden
                    ? 'Acesso restrito a administradores.'
                    : list.error instanceof Error
                      ? list.error.message
                      : 'Não foi possível consultar perguntas.'
                }
              />
              {!forbidden && (
                <Button variant="outline" onClick={() => void list.refetch()}>
                  Tentar novamente
                </Button>
              )}
            </Card>
          ) : list.data.page.totalElements === 0 ? (
            <Card>
              <p>Nenhuma pergunta corresponde aos filtros selecionados.</p>
            </Card>
          ) : (
            <>
              <p role="status">
                {list.data.page.totalElements} perguntas encontradas.
              </p>
              {list.data.content.length === 0 ? (
                <Card>
                  <p>Nenhuma pergunta nesta página.</p>
                </Card>
              ) : (
                <ul className="questions-admin-list">
                  {list.data.content.map((item) => (
                    <li key={item.id}>
                      <Card className="questions-admin-item">
                        <span className="questions-admin-status">
                          {statuses[item.status]}
                        </span>
                        <p>{item.enunciado}</p>
                        <Button
                          variant={
                            selectedId === item.id ? 'secondary' : 'outline'
                          }
                          disabled={busy}
                          onClick={() => select(item.id)}
                        >
                          Revisar pergunta
                        </Button>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
              {list.data.page.totalPages > 1 && (
                <nav
                  className="questions-admin-pagination"
                  aria-label="Paginação de perguntas"
                >
                  <Button
                    variant="outline"
                    disabled={busy || list.isFetching || page === 0}
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    Anterior
                  </Button>
                  <span aria-live="polite">
                    Página {page + 1} de {list.data.page.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={
                      busy ||
                      list.isFetching ||
                      page + 1 >= list.data.page.totalPages
                    }
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
        <section aria-labelledby="questions-detail-title">
          <h2 id="questions-detail-title">Detalhes e decisão</h2>
          {!selectedId ? (
            <Card>
              <p>
                Selecione uma pergunta para revisar, decidir ou consultar o
                histórico.
              </p>
            </Card>
          ) : detail.isPending ? (
            <p role="status">Carregando pergunta selecionada…</p>
          ) : detail.isError ? (
            <Card>
              <Notice
                message={
                  detail.error instanceof Error
                    ? detail.error.message
                    : 'Erro ao carregar pergunta.'
                }
              />
              <Button variant="outline" onClick={() => void detail.refetch()}>
                Tentar novamente
              </Button>
            </Card>
          ) : (
            question && (
              <Card className="questions-admin-detail">
                <span className="questions-admin-status">
                  {statuses[question.status]}
                </span>
                <h3>{question.enunciado}</h3>
                <p>
                  Tema: <code>{question.temaId}</code>
                </p>
                <p>
                  Origem: {question.origem} · Dificuldade:{' '}
                  {question.dificuldadeInicial}
                </p>
                <ol className="questions-admin-options" type="A">
                  {question.alternativas.map((alternative, index) => (
                    <li key={index}>
                      {index === question.respostaCorretaIndice ? (
                        <strong>{alternative} (correta)</strong>
                      ) : (
                        alternative
                      )}
                    </li>
                  ))}
                </ol>
                <p>Fonte: {question.fonteReferencia || 'Não informada'}</p>
                {editing ? (
                  <ReviewEditor
                    key={question.id}
                    question={question}
                    busy={busy}
                    onCancel={() => setEditing(false)}
                    onSave={(payload) =>
                      void mutate(
                        (signal) =>
                          reviewQuestion(question.id, payload, signal),
                        'Pergunta revisada e mantida pendente.',
                      )
                    }
                  />
                ) : (
                  <>
                    <div className="questions-admin-actions">
                      {question.status === 'PENDENTE' && (
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setEditing(true);
                            setDecision(null);
                          }}
                        >
                          Editar conteúdo
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => setShowHistory((value) => !value)}
                      >
                        {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
                      </Button>
                    </div>
                    {(question.status === 'PENDENTE' ||
                      question.status === 'APROVADA') && (
                      <div className="questions-admin-decisions">
                        <h4>Decisão administrativa</h4>
                        <div className="questions-admin-actions">
                          {question.status === 'PENDENTE' && (
                            <>
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => {
                                  setDecision('APROVAR');
                                  setReason('');
                                }}
                              >
                                Aprovar
                              </Button>
                              <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                  setDecision('REJEITAR');
                                  setReason('');
                                }}
                              >
                                Rejeitar
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setDecision('BLOQUEAR');
                              setReason('');
                            }}
                          >
                            Bloquear
                          </Button>
                        </div>
                        {decision && (
                          <div className="questions-admin-confirm">
                            <p>
                              Confirmar decisão:{' '}
                              <strong>{decisionNames[decision]}</strong>?
                            </p>
                            <label htmlFor="question-decision-reason">
                              Motivo{' '}
                              {decision === 'APROVAR'
                                ? '(opcional)'
                                : '(obrigatório)'}
                            </label>
                            <textarea
                              id="question-decision-reason"
                              value={reason}
                              maxLength={500}
                              required={decision !== 'APROVAR'}
                              disabled={busy}
                              onChange={(event) =>
                                setReason(event.target.value)
                              }
                            />
                            <div className="questions-admin-actions">
                              <Button
                                variant="secondary"
                                busy={busy}
                                onClick={confirmDecision}
                              >
                                Confirmar{' '}
                                {decisionNames[decision].toLowerCase()}
                              </Button>
                              <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                  setDecision(null);
                                  setReason('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {showHistory && (
                  <section
                    aria-label="Histórico de curadoria"
                    className="questions-admin-history"
                  >
                    <h4>Histórico de curadoria</h4>
                    {history.isPending ? (
                      <p role="status">Carregando histórico…</p>
                    ) : history.isError ? (
                      <Notice message="Não foi possível carregar o histórico." />
                    ) : history.data.length === 0 ? (
                      <p>Nenhuma revisão registrada.</p>
                    ) : (
                      <ol>
                        {history.data.map((event) => (
                          <li key={event.id}>
                            <strong>{event.acao}</strong> ·{' '}
                            {event.statusAnterior} → {event.statusNovo}
                            <p>
                              {event.motivo || 'Sem motivo registrado'} ·{' '}
                              {new Date(event.criadoEm).toLocaleString('pt-BR')}
                            </p>
                            <details>
                              <summary>Ver snapshots (contêm gabarito)</summary>
                              <pre>{event.antes ?? 'Sem estado anterior'}</pre>
                              <pre>
                                {event.depois ?? 'Sem estado posterior'}
                              </pre>
                            </details>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                )}
              </Card>
            )
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewEditor({
  question,
  busy,
  onCancel,
  onSave,
}: {
  question: ManagedQuestion;
  busy: boolean;
  onCancel: () => void;
  onSave: (data: QuestionReview) => void;
}) {
  const [enunciado, setEnunciado] = useState(question.enunciado);
  const [alternativas, setAlternativas] = useState([...question.alternativas]);
  const [correta, setCorreta] = useState(question.respostaCorretaIndice);
  const [dificuldade, setDificuldade] = useState<QuestionDifficulty>(
    question.dificuldadeInicial,
  );
  const [fonte, setFonte] = useState(question.fonteReferencia ?? '');
  const [motivo, setMotivo] = useState('');
  const [validation, setValidation] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = alternativas.map((value) =>
      value.trim().toLocaleLowerCase('pt-BR'),
    );
    if (
      enunciado.trim().length < 15 ||
      enunciado.trim().length > 500 ||
      alternativas.some((value) => !value.trim() || value.length > 250) ||
      new Set(normalized).size !== 4 ||
      !motivo.trim() ||
      motivo.length > 500 ||
      fonte.length > 500
    ) {
      setValidation(
        'Confira o enunciado (15–500 caracteres), as quatro alternativas distintas, a fonte e o motivo da revisão.',
      );
      return;
    }
    setValidation('');
    onSave({
      enunciado: enunciado.trim(),
      alternativas: alternativas.map((value) => value.trim()),
      respostaCorretaIndice: correta,
      dificuldadeInicial: dificuldade,
      fonteReferencia: fonte.trim() || null,
      motivo: motivo.trim(),
    });
  }
  return (
    <form className="questions-admin-editor" onSubmit={submit}>
      <fieldset disabled={busy}>
        <legend>Editar pergunta pendente</legend>
        <label htmlFor="question-enunciado">Enunciado</label>
        <textarea
          id="question-enunciado"
          minLength={15}
          maxLength={500}
          required
          value={enunciado}
          onChange={(event) => setEnunciado(event.target.value)}
        />
        {alternativas.map((value, index) => (
          <Input
            key={index}
            label={`Alternativa ${String.fromCharCode(65 + index)}`}
            value={value}
            maxLength={250}
            required
            onChange={(event) =>
              setAlternativas((current) =>
                current.map((item, pos) =>
                  pos === index ? event.target.value : item,
                ),
              )
            }
          />
        ))}
        <label htmlFor="question-gabarito">Alternativa correta</label>
        <select
          id="question-gabarito"
          value={correta}
          onChange={(event) => setCorreta(Number(event.target.value))}
        >
          <option value={0}>A</option>
          <option value={1}>B</option>
          <option value={2}>C</option>
          <option value={3}>D</option>
        </select>
        <label htmlFor="question-difficulty">Dificuldade</label>
        <select
          id="question-difficulty"
          value={dificuldade}
          onChange={(event) =>
            setDificuldade(event.target.value as QuestionDifficulty)
          }
        >
          <option value="FACIL">Fácil</option>
          <option value="MEDIA">Média</option>
          <option value="DIFICIL">Difícil</option>
        </select>
        <Input
          label="Fonte de referência"
          value={fonte}
          maxLength={500}
          onChange={(event) => setFonte(event.target.value)}
        />
        <label htmlFor="question-revision-reason">Motivo da revisão</label>
        <textarea
          id="question-revision-reason"
          value={motivo}
          required
          maxLength={500}
          onChange={(event) => setMotivo(event.target.value)}
        />
        {validation && <Notice message={validation} />}
        <div className="questions-admin-actions">
          <Button type="submit" variant="secondary" busy={busy}>
            Salvar revisão
          </Button>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Cancelar edição
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
