import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { getManagedThemes } from '../themes/api';
import {
  generateAIQuestions,
  getAIQuestionGenerationStatus,
} from './api';

type Props = {
  onCancel: () => void;
  onGenerated: (ids: string[]) => void;
};

/**
 * Geração só ocorre no clique confirmado do ADMIN.
 * Não há retry automático: timeout pode representar custo já consumido.
 */
export function GenerateAIQuestions({ onCancel, onGenerated }: Props) {
  const status = useQuery({
    queryKey: ['questions-admin', 'ai-generation-status'],
    queryFn: ({ signal }) => getAIQuestionGenerationStatus(signal),
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  const themes = useQuery({
    queryKey: ['questions-admin', 'ai-approved-themes'],
    queryFn: ({ signal }) => getManagedThemes(signal),
    enabled: status.data?.habilitada === true,
    retry: false,
    refetchOnReconnect: false,
  });
  const approvedThemes =
    themes.data?.filter((theme) => theme.status === 'APROVADO') ?? [];

  const [temaId, setTemaId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [confirmado, setConfirmado] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || attempted || request.current) return;
    const limites = status.data;
    if (
      !limites?.habilitada ||
      !approvedThemes.some((theme) => theme.id === temaId) ||
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > limites.maximoPorSolicitacao ||
      quantidade > 3 ||
      limites.requisicoesHoje >= limites.limiteRequisicoesDiarias ||
      limites.perguntasHoje + quantidade > limites.limitePerguntasDiarias ||
      !confirmado
    ) {
      setError('Confira o tema, a quantidade, a cota disponível e a confirmação de custo.');
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setAttempted(true);
    setError('');
    try {
      const ids = await generateAIQuestions(
        { temaId, quantidade },
        crypto.randomUUID(),
        controller.signal,
      );
      if (!controller.signal.aborted) onGenerated(ids);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'Não foi possível confirmar a geração.',
      );
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <Card className="questions-admin-ia">
      <h2>Gerar perguntas candidatas com IA</h2>
      <p>
        As perguntas geradas serão <strong>pendentes</strong> e precisarão de
        aprovação humana para entrar no jogo.
      </p>

      {status.isPending ? (
        <p role="status">Consultando disponibilidade e cotas…</p>
      ) : status.isError ? (
        <Notice message="O serviço de geração ainda não está disponível. Aguardando publicação do backend." />
      ) : !status.data.habilitada ? (
        <Notice message="A geração por IA está desativada no servidor. O cadastro manual continua disponível." />
      ) : themes.isPending ? (
        <p role="status">Consultando temas aprovados…</p>
      ) : themes.isError ? (
        <Notice message="Não foi possível consultar os temas aprovados." />
      ) : approvedThemes.length === 0 ? (
        <Notice message="É necessário haver um tema aprovado para solicitar geração." />
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={busy || attempted}>
            <legend>Solicitação de geração</legend>
            <p role="status">
              Cota de hoje: {status.data.requisicoesHoje} de{' '}
              {status.data.limiteRequisicoesDiarias} solicitações,{' '}
              {status.data.perguntasHoje} de{' '}
              {status.data.limitePerguntasDiarias} perguntas.
            </p>
            <label htmlFor="ai-question-theme">Tema aprovado</label>
            <select
              id="ai-question-theme"
              value={temaId}
              required
              onChange={(event) => setTemaId(event.target.value)}
            >
              <option value="">Selecione um tema</option>
              {approvedThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.titulo}
                </option>
              ))}
            </select>
            <label htmlFor="ai-question-amount">Quantidade de perguntas</label>
            <select
              id="ai-question-amount"
              value={quantidade}
              onChange={(event) => setQuantidade(Number(event.target.value))}
            >
              {Array.from(
                { length: Math.min(3, status.data.maximoPorSolicitacao) },
                (_, index) => index + 1,
              ).map((number) => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
            <label className="questions-admin-ia-confirm">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(event) => setConfirmado(event.target.checked)}
              />
              Confirmo que esta solicitação pode consumir créditos da API de IA.
              As questões passarão por curadoria antes de serem usadas.
            </label>
            {error && <Notice message={error} />}
            {attempted && (
              <Notice message="Essa tentativa não será repetida automaticamente. Verifique a fila de perguntas antes de solicitar outra; uma falha ou timeout pode ter gerado custo." />
            )}
            <div className="questions-admin-actions">
              <Button type="submit" variant="secondary" busy={busy}>
                Solicitar geração
              </Button>
              <Button variant="outline" disabled={busy} onClick={onCancel}>
                Fechar
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {!busy && (!status.data?.habilitada || status.isError) && (
        <Button variant="outline" onClick={onCancel}>
          Fechar
        </Button>
      )}
    </Card>
  );
}
