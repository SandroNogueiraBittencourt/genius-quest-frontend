import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import { getApprovedCategories } from '../categories/api';
import {
  getCurrentCycle,
  getCycleRanking,
  getThemes,
  suggestTheme,
  voteTheme,
} from './api';
import type { Theme } from './types';
import './Themes.css';

export function Themes({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="themes-page">
      <header className="themes-heading">
        <span className="gq-kicker">A comunidade escolhe</span>
        <h1>Ideias que viram descobertas.</h1>
        <p>
          Sugira temas, vote nos seus favoritos e acompanhe o próximo assunto
          das nossas perguntas.
        </p>
      </header>
      {session ? (
        <SignedInThemes key={session.token} />
      ) : (
        <Card className="themes-login">
          <h2>Faça parte da escolha.</h2>
          <p>Entre na sua conta para sugerir temas e participar da votação.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para participar
          </Button>
        </Card>
      )}
    </section>
  );
}

function SignedInThemes() {
  const session = useAuthStore((state) => state.session);
  const client = useQueryClient();
  const [categoriaId, setCategoriaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [busy, setBusy] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voted, setVoted] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<Theme | null>(null);

  const queryIdentity = [session?.email, session?.expiresAt];
  const themes = useQuery({
    queryKey: ['themes', 'approved', ...queryIdentity],
    queryFn: ({ signal }) => getThemes(signal),
    enabled: !!session,
    retry: false,
  });
  const categories = useQuery({
    queryKey: ['themes', 'categories', ...queryIdentity],
    queryFn: ({ signal }) => getApprovedCategories(signal),
    enabled: !!session,
    retry: false,
  });
  const cycle = useQuery({
    queryKey: ['themes', 'cycle', ...queryIdentity],
    queryFn: ({ signal }) => getCurrentCycle(signal),
    enabled: !!session,
    retry: false,
  });
  const ranking = useQuery({
    queryKey: ['themes', 'ranking', cycle.data?.id, ...queryIdentity],
    queryFn: ({ signal }) => getCycleRanking(cycle.data!.id, signal),
    enabled: !!session && !!cycle.data,
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

  async function vote(id: string) {
    if (votingId) return;
    setVotingId(id);
    setError('');
    setNotice('');
    try {
      await voteTheme(id);
      setVoted((previous) => [...previous, id]);
      setNotice('Seu voto foi registrado!');
      await client.invalidateQueries({ queryKey: ['themes', 'ranking'] });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível votar.',
      );
    } finally {
      setVotingId(null);
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
      <div className="themes-layout">
        <section aria-labelledby="themes-list-title">
          <div className="themes-section-heading">
            <h2 id="themes-list-title">Temas aprovados</h2>
            <Button variant="outline" onClick={() => void themes.refetch()}>
              Atualizar
            </Button>
          </div>
          {cycle.isPending ? (
            <p role="status">Consultando a votação…</p>
          ) : cycle.isError ? (
            <Notice message="Não foi possível consultar o ciclo atual." />
          ) : cycle.data ? (
            <p className="themes-cycle" role="status">
              Votação aberta: <strong>{cycle.data.nome}</strong>
            </p>
          ) : (
            <p className="themes-cycle">
              Ainda não há um ciclo de votação aberto. Você pode sugerir temas.
            </p>
          )}
          {themes.isPending ? (
            <p role="status">Carregando temas…</p>
          ) : themes.isError ? (
            <Notice message="Não foi possível carregar os temas aprovados." />
          ) : themes.data.length === 0 ? (
            <Card>
              <p>Ainda não há temas aprovados. Envie a primeira sugestão.</p>
            </Card>
          ) : (
            <ul className="themes-list">
              {themes.data.map((theme) => (
                <li key={theme.id}>
                  <Card className="themes-card">
                    <h3>{theme.titulo}</h3>
                    <p>
                      {theme.descricao || 'Um novo assunto para descobrir.'}
                    </p>
                    <Button
                      variant="secondary"
                      busy={votingId === theme.id}
                      loadingLabel="Registrando voto…"
                      disabled={
                        !cycle.data || !!votingId || voted.includes(theme.id)
                      }
                      onClick={() => void vote(theme.id)}
                    >
                      {voted.includes(theme.id)
                        ? 'Voto registrado'
                        : 'Votar neste tema'}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          {cycle.data && (
            <section
              aria-labelledby="themes-ranking-title"
              className="themes-ranking"
            >
              <h2 id="themes-ranking-title">Classificação do ciclo</h2>
              {ranking.isPending ? (
                <p role="status">Carregando classificação…</p>
              ) : ranking.isError ? (
                <Notice message="Não foi possível consultar o ranking." />
              ) : ranking.data.length === 0 ? (
                <p>Nenhum tema elegível neste ciclo.</p>
              ) : (
                <ol>
                  {ranking.data.map((item) => (
                    <li key={item.temaId}>
                      <strong>{item.titulo}</strong>
                      <span>
                        {item.votos} {item.votos === 1 ? 'voto' : 'votos'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </section>
        <section aria-labelledby="themes-suggest-title">
          <Card className="themes-suggest">
            <span className="gq-kicker">Sua voz conta</span>
            <h2 id="themes-suggest-title">Sugira um tema</h2>
            <p>Toda sugestão passa pela moderação antes de receber votos.</p>
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
                      Ainda não há categorias aprovadas. Acesse Categorias,
                      sugira uma e aguarde a aprovação pela moderação para
                      enviar seu tema.
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
                  <label htmlFor="themes-description">
                    Descrição (opcional)
                  </label>
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
                  disabled={
                    !categories.isSuccess || categories.data.length === 0
                  }
                  loadingLabel="Enviando…"
                >
                  Enviar sugestão
                </Button>
              </fieldset>
            </form>
          </Card>
        </section>
      </div>
    </>
  );
}
