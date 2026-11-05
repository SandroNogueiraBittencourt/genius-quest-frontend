import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import {
  changeCategoryStatus,
  getManagedCategories,
  updateCategory,
} from './api';
import type { Category, CategoryStatus } from './types';
import './Categories.css';

const statuses: Record<CategoryStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REMOVIDA: 'Removida',
};

export function CategoriesAdmin({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="categories-page" aria-labelledby="moderation-title">
      <header className="categories-heading">
        <div>
          <span className="gq-kicker">Curadoria responsável</span>
          <h1 id="moderation-title">Moderação de categorias.</h1>
          <p>Aprovar, editar ou remover assuntos sugeridos.</p>
        </div>
      </header>
      {session ? (
        <ManagedCategories key={session.token} />
      ) : (
        <Card>
          <p>Entre com uma conta administradora para acessar a moderação.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para moderar
          </Button>
        </Card>
      )}
    </section>
  );
}

function ManagedCategories() {
  const session = useAuthStore((state) => state.session);
  const client = useQueryClient();
  const [filter, setFilter] = useState<CategoryStatus | 'TODAS'>('PENDENTE');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const categories = useQuery({
    queryKey: ['categories', 'admin', session?.email, session?.expiresAt],
    queryFn: ({ signal }) => getManagedCategories(signal),
    enabled: !!session,
    retry: false,
    refetchOnReconnect: false,
  });

  async function mutate(
    category: Category,
    kind: 'aprovar' | 'remover' | 'editar',
  ) {
    if (request.current) return;
    if (
      kind === 'editar' &&
      (!nome.trim() || nome.length > 80 || descricao.length > 255)
    ) {
      setError(
        'Informe nome com até 80 caracteres e descrição de até 255 caracteres.',
      );
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusyId(category.id);
    setError('');
    setMessage('');

    try {
      const updated =
        kind === 'editar'
          ? await updateCategory(
              category.id,
              { nome, descricao },
              controller.signal,
            )
          : await changeCategoryStatus(category.id, kind, controller.signal);

      if (controller.signal.aborted) return;
      setEditingId(null);
      setRemoveId(null);
      setMessage(
        'Categoria "' +
          updated.nome +
          '" atualizada: ' +
          statuses[updated.status] +
          '.',
      );
      await client.invalidateQueries({ queryKey: ['categories'] });
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof ApiError && cause.status === 403
          ? 'Sua conta não tem permissão para moderar categorias.'
          : cause instanceof ApiError && cause.status === 409
            ? 'Já existe uma categoria com esse nome.'
            : cause instanceof Error
              ? cause.message
              : 'Não foi possível atualizar a categoria.',
      );
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusyId(null);
    }
  }

  const visible =
    categories.data?.filter(
      (category) => filter === 'TODAS' || category.status === filter,
    ) ?? [];
  const forbidden =
    categories.error instanceof ApiError && categories.error.status === 403;

  return (
    <div className="categories-admin">
      <p>
        As decisões de moderação são realizadas somente pelo backend autorizado.
      </p>
      {categories.isPending ? (
        <p role="status">Carregando categorias para moderação…</p>
      ) : categories.isError ? (
        <Card>
          <Notice
            message={
              forbidden
                ? 'Acesso restrito a administradores.'
                : categories.error instanceof Error
                  ? categories.error.message
                  : 'Não foi possível consultar as categorias.'
            }
          />
          {!forbidden && (
            <Button variant="outline" onClick={() => void categories.refetch()}>
              Tentar novamente
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div
            className="categories-admin-filters"
            aria-label="Filtrar categorias"
          >
            {(['PENDENTE', 'APROVADA', 'REMOVIDA', 'TODAS'] as const).map(
              (status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'secondary' : 'outline'}
                  aria-pressed={filter === status}
                  onClick={() => setFilter(status)}
                >
                  {status === 'TODAS' ? 'Todas' : statuses[status]}
                </Button>
              ),
            )}
          </div>
          {error && (
            <div role="alert">
              <Notice message={error} />
            </div>
          )}
          {message && <p role="status">{message}</p>}
          <p role="status">{visible.length} categorias encontradas.</p>
          {visible.length === 0 && <p>Nenhuma categoria neste status.</p>}
          <ul className="categories-admin-list">
            {visible.map((category) => (
              <li key={category.id}>
                <Card>
                  <span className="category-status">
                    {statuses[category.status]}
                  </span>
                  <h2>{category.nome}</h2>
                  <p>{category.descricao || 'Sem descrição'}</p>
                  {editingId === category.id ? (
                    <form
                      className="categories-admin-edit"
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        void mutate(category, 'editar');
                      }}
                    >
                      <Input
                        label="Nome para edição"
                        value={nome}
                        maxLength={80}
                        required
                        disabled={busyId !== null}
                        onChange={(event) => setNome(event.target.value)}
                      />
                      <label htmlFor={'cat-desc-' + category.id}>
                        Descrição para edição
                      </label>
                      <textarea
                        id={'cat-desc-' + category.id}
                        className="ui-input"
                        value={descricao}
                        maxLength={255}
                        disabled={busyId !== null}
                        onChange={(event) => setDescricao(event.target.value)}
                      />
                      <div className="categories-admin-actions">
                        <Button type="submit" busy={busyId === category.id}>
                          Salvar alteração
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId !== null}
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar edição
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="categories-admin-actions">
                      {category.status !== 'APROVADA' && (
                        <Button
                          variant="secondary"
                          busy={busyId === category.id}
                          disabled={busyId !== null}
                          onClick={() => void mutate(category, 'aprovar')}
                        >
                          Aprovar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        disabled={busyId !== null}
                        onClick={() => {
                          setError('');
                          setRemoveId(null);
                          setEditingId(category.id);
                          setNome(category.nome);
                          setDescricao(category.descricao ?? '');
                        }}
                      >
                        Editar
                      </Button>
                      {category.status !== 'REMOVIDA' &&
                        removeId !== category.id && (
                          <Button
                            variant="outline"
                            disabled={busyId !== null}
                            onClick={() => setRemoveId(category.id)}
                          >
                            Remover
                          </Button>
                        )}
                      {removeId === category.id && (
                        <>
                          <Button
                            variant="secondary"
                            busy={busyId === category.id}
                            onClick={() => void mutate(category, 'remover')}
                          >
                            Confirmar remoção
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setRemoveId(null)}
                          >
                            Cancelar remoção
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
