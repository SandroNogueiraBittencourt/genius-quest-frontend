import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { getManagedThemes } from '../themes/api';
import { createManualQuestion } from './api';
import type { QuestionDifficulty } from './types';

type Props = {
  onCancel: () => void;
  onCreated: (id: string) => void;
};

export function CreateManualQuestion({ onCancel, onCreated }: Props) {
  const themes = useQuery({
    queryKey: ['questions-admin', 'approved-themes'],
    queryFn: ({ signal }) => getManagedThemes(signal),
    retry: false,
    refetchOnReconnect: false,
  });
  const approvedThemes =
    themes.data?.filter((theme) => theme.status === 'APROVADO') ?? [];
  const [temaId, setTemaId] = useState('');
  const [enunciado, setEnunciado] = useState('');
  const [alternativas, setAlternativas] = useState(['', '', '', '']);
  const [correta, setCorreta] = useState(0);
  const [dificuldade, setDificuldade] = useState<QuestionDifficulty>('MEDIA');
  const [fonte, setFonte] = useState('');
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || request.current) return;
    const normalized = alternativas.map((text) =>
      text.trim().toLocaleLowerCase('pt-BR'),
    );
    if (
      !approvedThemes.some((theme) => theme.id === temaId) ||
      enunciado.trim().length < 15 ||
      enunciado.trim().length > 500 ||
      alternativas.some((text) => !text.trim() || text.length > 250) ||
      new Set(normalized).size !== 4 ||
      fonte.length > 500
    ) {
      setValidation(
        'Selecione um tema aprovado e informe enunciado (15–500 caracteres), quatro alternativas distintas e fonte válida.',
      );
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setValidation('');
    try {
      const id = await createManualQuestion(
        {
          temaId,
          enunciado: enunciado.trim(),
          alternativas: alternativas.map((item) => item.trim()),
          respostaCorretaIndice: correta,
          dificuldadeInicial: dificuldade,
          fonteReferencia: fonte.trim() || null,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) onCreated(id);
    } catch (error) {
      if (controller.signal.aborted) return;
      setValidation(
        error instanceof ApiError && error.status === 403
          ? 'Sua conta não tem permissão para criar perguntas.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível cadastrar a pergunta.',
      );
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <Card className="questions-admin-create">
      <h2>Cadastrar pergunta manual</h2>
      <p>
        A pergunta será enviada para revisão com status pendente.
        Nenhuma resposta será publicada automaticamente.
      </p>
      {themes.isPending ? (
        <p role="status">Consultando temas aprovados…</p>
      ) : themes.isError ? (
        <Notice message="Não foi possível consultar os temas. Verifique sua permissão e tente novamente." />
      ) : approvedThemes.length === 0 ? (
        <Notice message="Não existem temas aprovados disponíveis para cadastrar perguntas." />
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={busy}>
            <legend>Dados da candidata</legend>
            <label htmlFor="manual-question-theme">Tema aprovado</label>
            <select
              id="manual-question-theme"
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
            <label htmlFor="manual-question-text">Enunciado</label>
            <textarea
              id="manual-question-text"
              value={enunciado}
              required
              minLength={15}
              maxLength={500}
              onChange={(event) => setEnunciado(event.target.value)}
            />
            {alternativas.map((value, index) => (
              <Input
                key={index}
                label={`Alternativa ${String.fromCharCode(65 + index)}`}
                value={value}
                required
                maxLength={250}
                onChange={(event) =>
                  setAlternativas((current) =>
                    current.map((item, position) =>
                      position === index ? event.target.value : item,
                    ),
                  )
                }
              />
            ))}
            <label htmlFor="manual-question-correct">Alternativa correta</label>
            <select
              id="manual-question-correct"
              value={correta}
              onChange={(event) => setCorreta(Number(event.target.value))}
            >
              <option value={0}>A</option>
              <option value={1}>B</option>
              <option value={2}>C</option>
              <option value={3}>D</option>
            </select>
            <label htmlFor="manual-question-difficulty">Dificuldade</label>
            <select
              id="manual-question-difficulty"
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
              label="Fonte de referência (opcional)"
              value={fonte}
              maxLength={500}
              onChange={(event) => setFonte(event.target.value)}
            />
            {validation && <Notice message={validation} />}
            <div className="questions-admin-actions">
              <Button type="submit" busy={busy} variant="secondary">
                Cadastrar como pendente
              </Button>
              <Button variant="outline" disabled={busy} onClick={onCancel}>
                Cancelar cadastro
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </Card>
  );
}
