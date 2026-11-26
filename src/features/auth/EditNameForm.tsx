import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { getProfileName, updateProfileName } from './api';

export function EditNameForm({
  userId,
  expiresAt,
  disabled,
}: {
  userId: string;
  expiresAt: number;
  disabled: boolean;
}) {
  const client = useQueryClient();
  const queryKey = ['profile-name', userId, expiresAt];
  const profile = useQuery({
    queryKey,
    queryFn: ({ signal }) => getProfileName(userId, signal),
    retry: false,
  });
  const [draft, setDraft] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const name = draft ?? profile.data ?? '';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || request.current || profile.data === undefined) return;

    const trimmed = name.trim();
    setFieldError('');
    setRequestError('');
    setSaved(false);
    if (trimmed.length < 3 || trimmed.length > 100) {
      setFieldError('Informe um nome entre 3 e 100 caracteres.');
      return;
    }
    if (trimmed === profile.data) return;

    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const confirmed = await updateProfileName(
        userId,
        trimmed,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      await client.cancelQueries({ queryKey, exact: true });
      if (controller.signal.aborted) return;
      client.setQueryData(queryKey, confirmed);
      setDraft(null);
      setSaved(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.fields.nome)
        setFieldError(error.fields.nome);
      else
        setRequestError(
          error instanceof ApiError
            ? error.message
            : 'Não foi possível salvar o nome. Tente novamente.',
        );
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <section className="auth-edit-name" aria-labelledby="edit-name-title">
      <h2 id="edit-name-title">Nome do perfil</h2>
      {profile.data === undefined ? (
        profile.isError ? (
          <>
            <Notice message="Não foi possível carregar seu nome." />
            <Button
              variant="outline"
              busy={profile.isFetching}
              onClick={() => void profile.refetch()}
            >
              Tentar carregar novamente
            </Button>
          </>
        ) : (
          <p role="status">Carregando seu nome…</p>
        )
      ) : (
        <form
          noValidate
          aria-busy={pending}
          onSubmit={(event) => void submit(event)}
        >
          <Input
            label="Nome"
            name="nome"
            autoComplete="name"
            required
            maxLength={100}
            value={name}
            disabled={disabled || pending}
            error={fieldError}
            onChange={(event) => {
              setDraft(event.target.value);
              setFieldError('');
              setRequestError('');
              setSaved(false);
            }}
          />
          {requestError && <Notice message={requestError} />}
          {saved && <p role="status">Nome atualizado.</p>}
          <Button
            type="submit"
            variant="secondary"
            className="auth-submit"
            busy={pending}
            loadingLabel="Salvando nome…"
            disabled={disabled || name.trim() === profile.data}
          >
            Salvar nome
          </Button>
        </form>
      )}
    </section>
  );
}
