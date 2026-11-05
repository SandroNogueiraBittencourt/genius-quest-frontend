import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import { suggestCategory } from './api';
import { approvedCategoriesKey, useApprovedCategories } from './queries';
import type { Category, CategoryStatus } from './types';
import './Categories.css';

const statusLabels: Record<CategoryStatus, string> = {
  PENDENTE: 'Pendente de revisão',
  APROVADA: 'Aprovada',
  REMOVIDA: 'Removida',
};

export function Categories({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <div className="categories-page">
      <header className="categories-heading">
        <div>
          <span className="gq-kicker">Um mundo de assuntos</span>
          <h1>Categorias para descobrir.</h1>
          <p>
            Explore as categorias aprovadas e compartilhe uma ideia que desperte
            novas conversas.
          </p>
        </div>
        <span className="categories-affection" aria-hidden="true">
          Toda descoberta
          <br />
          começa com curiosidade.
        </span>
      </header>
      {session ? (
        <SignedInCategories key={session.email + ':' + session.expiresAt} />
      ) : (
        <Card className="categories-sign-in">
          <img
            src="/brand/genius-quest-icon.svg"
            alt=""
            width="72"
            height="72"
          />
          <h2>Entre para explorar com a gente.</h2>
          <p>
            Na sua conta, você pode conhecer as categorias aprovadas e sugerir
            novos assuntos para revisão.
          </p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para ver categorias
          </Button>
          <p className="categories-small">
            Ainda não tem conta? Você pode criar uma na tela de entrada.
          </p>
        </Card>
      )}
    </div>
  );
}

function SignedInCategories() {
  const categories = useApprovedCategories();
  const session = useAuthStore((state) => state.session);
  const client = useQueryClient();
  const forbidden =
    categories.error instanceof ApiError && categories.error.status === 403;
  return (
    <div className="categories-layout">
      <section
        className="categories-list-section"
        aria-labelledby="approved-title"
      >
        <div className="categories-list-heading">
          <div>
            <h2 id="approved-title">Categorias aprovadas</h2>
            <p>Novas sugestões aparecem aqui depois da aprovação.</p>
          </div>
          {categories.isSuccess && (
            <Button
              variant="outline"
              busy={categories.isFetching}
              loadingLabel="Atualizando…"
              onClick={() => void categories.refetch()}
            >
              Atualizar lista
            </Button>
          )}
        </div>
        {categories.isPending ? (
          <Card className="categories-state">
            <p role="status" className="categories-loading">
              Buscando categorias…
            </p>
            <p>Preparando novos assuntos para descobrir.</p>
          </Card>
        ) : categories.isError ? (
          <Card className="categories-state">
            <Notice
              message={
                forbidden
                  ? 'Sua conta não tem permissão para consultar as categorias.'
                  : categories.error instanceof Error
                    ? categories.error.message
                    : 'Não foi possível carregar as categorias.'
              }
            />
            {!forbidden && (
              <Button
                variant="outline"
                onClick={() => void categories.refetch()}
              >
                Tentar carregar novamente
              </Button>
            )}
          </Card>
        ) : categories.data.length === 0 ? (
          <Card className="categories-state">
            <span className="categories-state-label">
              Espaço para novas ideias
            </span>
            <h3>A primeira descoberta pode começar com você.</h3>
            <p>
              Ainda não há categorias aprovadas. Envie uma sugestão; ela ficará
              disponível nesta lista após revisão.
            </p>
          </Card>
        ) : (
          <>
            <p className="categories-count" role="status">
              {categories.data.length}{' '}
              {categories.data.length === 1
                ? 'categoria aprovada'
                : 'categorias aprovadas'}
            </p>
            <ul className="categories-grid">
              {categories.data.map((category) => (
                <li key={category.id}>
                  <Card className="category-card">
                    <span className="category-status">Aprovada</span>
                    <h3>{category.nome}</h3>
                    <p>
                      {category.descricao?.trim() ||
                        'Uma oportunidade de descobrir algo novo juntos.'}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
        <aside className="categories-care">
          <strong>Uma ideia pode abrir muitas conversas.</strong>
          <p>
            As sugestões passam por revisão antes de fazer parte das categorias
            aprovadas.
          </p>
        </aside>
      </section>
      <section aria-labelledby="suggestion-title">
        <SuggestionForm
          onCreated={() => {
            if (session)
              void client.invalidateQueries({
                queryKey: approvedCategoriesKey(session),
              });
          }}
        />
      </section>
    </div>
  );
}

function SuggestionForm({ onCreated }: { onCreated: () => void }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<Category | null>(null);
  const request = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const needsErrorFocus = useRef(false);
  const success = useRef<HTMLDivElement>(null);
  const wasSent = useRef(false);
  const descriptionId = useId();
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!needsErrorFocus.current) return;
    needsErrorFocus.current = false;
    if (Object.keys(errors).length)
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    else if (message) errorSummary.current?.focus();
  }, [errors, message]);
  useEffect(() => {
    if (sent) success.current?.focus();
    else if (wasSent.current) form.current?.querySelector('input')?.focus();
    wasSent.current = !!sent;
  }, [sent]);

  function edit(field: string, value: string) {
    if (field === 'nome') setNome(value);
    else setDescricao(value);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const invalid: Record<string, string> = {};
    if (!nome.trim() || nome.length > 80)
      invalid.nome = 'Informe um nome com até 80 caracteres.';
    if (descricao.length > 255)
      invalid.descricao = 'Use até 255 caracteres na descrição.';
    setErrors(invalid);
    setMessage('');
    if (Object.keys(invalid).length) {
      needsErrorFocus.current = true;
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const category = await suggestCategory(
        { nome, descricao },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setSent(category);
      setNome('');
      setDescricao('');
      onCreated();
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      )
        return;
      const fields: Record<string, string> = {};
      if (error instanceof ApiError) {
        for (const field of ['nome', 'descricao'])
          if (error.fields[field]) fields[field] = error.fields[field];
        if (error.status === 409)
          fields.nome =
            'Já existe uma categoria com esse nome. Experimente outro assunto ou nome.';
      }
      needsErrorFocus.current = true;
      setErrors(fields);
      setMessage(
        error instanceof ApiError && error.status === 403
          ? 'Sua conta não tem permissão para enviar sugestões.'
          : error instanceof ApiError && error.status === 0
            ? 'Não conseguimos confirmar o envio. Confira sua conexão e tente novamente. Seus campos foram mantidos.'
            : Object.keys(fields).length
              ? 'Confira os campos indicados para continuar.'
              : error instanceof Error
                ? error.message
                : 'Não foi possível enviar sua sugestão. Tente novamente.',
      );
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <Card className="category-suggestion">
      <span className="gq-kicker">Sua ideia tem lugar aqui</span>
      <h2 id="suggestion-title">O que desperta sua curiosidade?</h2>
      {sent ? (
        <div
          className="category-success"
          ref={success}
          tabIndex={-1}
          role="status"
        >
          <span className="category-status">{statusLabels[sent.status]}</span>
          <h3>Sugestão recebida!</h3>
          <p>
            <strong>{sent.nome}</strong>
          </p>
          <p>
            {sent.status === 'PENDENTE'
              ? 'Sua ideia foi enviada para revisão. Ela aparecerá nas categorias aprovadas se for aprovada.'
              : 'O status acima foi informado pelo backend. A lista mostra as categorias aprovadas.'}
          </p>
          <Button variant="outline" onClick={() => setSent(null)}>
            Sugerir outra categoria
          </Button>
        </div>
      ) : (
        <>
          <p>
            Conte um assunto que você gostaria de explorar. Nossa curadoria
            revisará a sugestão.
          </p>
          <form ref={form} onSubmit={(event) => void submit(event)} noValidate>
            <fieldset disabled={pending} className="category-fields">
              <legend className="gq-sr-only">Sua sugestão de categoria</legend>
              <Input
                label="Nome da categoria"
                name="nome"
                value={nome}
                onChange={(event) => edit('nome', event.target.value)}
                maxLength={80}
                required
                error={errors.nome}
                autoComplete="off"
                hint="Até 80 caracteres. Ex.: Astronomia."
              />
              <div className="ui-field">
                <label htmlFor={descriptionId}>
                  Descrição{' '}
                  <span className="categories-optional">(opcional)</span>
                </label>
                <textarea
                  id={descriptionId}
                  name="descricao"
                  className="ui-input category-description"
                  rows={4}
                  maxLength={255}
                  value={descricao}
                  onChange={(event) => edit('descricao', event.target.value)}
                  aria-invalid={errors.descricao ? true : undefined}
                  aria-describedby={descriptionId + '-help'}
                />
                <p
                  id={descriptionId + '-help'}
                  className={
                    errors.descricao ? 'ui-field-error' : 'ui-field-hint'
                  }
                  role={errors.descricao ? 'alert' : undefined}
                >
                  {errors.descricao ||
                    'Até 255 caracteres para explicar a sua ideia.'}
                </p>
              </div>
              <Button
                type="submit"
                busy={pending}
                loadingLabel="Enviando sugestão…"
              >
                Enviar para revisão
              </Button>
            </fieldset>
            {message && (
              <div
                ref={errorSummary}
                tabIndex={-1}
                className="category-error-summary"
              >
                <Notice message={message} />
              </div>
            )}
          </form>
          <p className="categories-small">
            A sugestão fica pendente até a revisão. Você não precisa enviar a
            mesma ideia novamente.
          </p>
        </>
      )}
    </Card>
  );
}
