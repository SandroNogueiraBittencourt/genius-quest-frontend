import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import { getApprovedCategories } from '../categories/api';
import { suggestTheme } from './api';
import type { Theme } from './types';
import './Themes.css';

export function Themes({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="themes-page">
      <header className="themes-heading">
        <h1>Sugerir temas</h1>
      </header>
      {session ? (
        <SignedInThemes key={session.token} />
      ) : (
        <Card className="themes-login">
          <p>Entre na sua conta para sugerir um tema.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para sugerir temas
          </Button>
        </Card>
      )}
    </section>
  );
}

function SignedInThemes() {
  const session = useAuthStore((state) => state.session);
  const [categoriaId, setCategoriaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<Theme | null>(null);

  const queryIdentity = [session?.email, session?.expiresAt];
  const categories = useQuery({
    queryKey: ['themes', 'categories', ...queryIdentity],
    queryFn: ({ signal }) => getApprovedCategories(signal),
    enabled: !!session,
    retry: false,
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!categoriaId || titulo.trim().length < 3 || titulo.length > 120) {
      setError(
        'Selecione a categoria e informe um título entre 3 e 120 caracteres.',
      );
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await suggestTheme({ categoriaId, titulo, descricao });
      setSubmitted(result);
      setTitulo('');
      setDescricao('');
      setNotice('Sua sugestão foi enviada para revisão.');
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? 'Esse tema já foi sugerido nesta categoria.'
          : cause instanceof Error
            ? cause.message
            : 'Não foi possível enviar a sugestão.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <Notice message={error} />}
      {notice && (
        <p role="status" className="themes-success">
          {notice}
        </p>
      )}
      <section
        className="themes-suggestion"
        aria-labelledby="themes-suggest-title"
      >
        <Card className="themes-suggest">
          <h2 id="themes-suggest-title">Sugira um tema</h2>
          <p>
            Sua sugestão passa pela moderação antes de ficar disponível nas
            salas.
          </p>
          {submitted && (
            <p role="status" className="themes-success">
              {submitted.titulo} — {submitted.status}
            </p>
          )}
          <form onSubmit={(event) => void submit(event)}>
            <fieldset disabled={busy} className="themes-fields">
              <legend className="gq-sr-only">Dados da sua sugestão</legend>
              <div className="ui-field">
                <label htmlFor="themes-category">Categoria aprovada</label>
                <select
                  id="themes-category"
                  required
                  disabled={
                    !categories.isSuccess || categories.data.length === 0
                  }
                  className="ui-input"
                  value={categoriaId}
                  onChange={(event) => setCategoriaId(event.target.value)}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nome}
                    </option>
                  ))}
                </select>
                {categories.isPending && (
                  <p role="status">Carregando categorias aprovadas…</p>
                )}
                {categories.isError && (
                  <p role="alert">Não foi possível carregar as categorias.</p>
                )}
                {categories.isSuccess && categories.data.length === 0 && (
                  <p role="alert" className="themes-category-help">
                    Ainda não há categorias aprovadas. Acesse Categorias, sugira
                    uma e aguarde a aprovação pela moderação para enviar seu
                    tema.
                  </p>
                )}
              </div>
              <Input
                label="Título do tema"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                minLength={3}
                maxLength={120}
                required
                hint="Entre 3 e 120 caracteres."
              />
              <div className="ui-field">
                <label htmlFor="themes-description">Descrição (opcional)</label>
                <textarea
                  id="themes-description"
                  className="ui-input"
                  rows={4}
                  maxLength={500}
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                busy={busy}
                disabled={!categories.isSuccess || categories.data.length === 0}
                loadingLabel="Enviando…"
              >
                Enviar sugestão
              </Button>
            </fieldset>
          </form>
        </Card>
      </section>
    </>
  );
}
