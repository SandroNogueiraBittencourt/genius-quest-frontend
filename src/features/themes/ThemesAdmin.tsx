import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Notice } from '../../components/ui';
import { ApiError } from '../../services/http';
import { useAuthStore } from '../auth/store';
import {
  closeCycle,
  createCycle,
  getCurrentCycle,
  getManagedThemes,
  moderateTheme,
} from './api';
import type { Theme, ThemeStatus } from './types';
import './Themes.css';

const labels: Record<ThemeStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  SUSPENSO: 'Suspenso',
  REMOVIDO: 'Removido',
};

export function ThemesAdmin({ onSignIn }: { onSignIn: () => void }) {
  const session = useAuthStore((state) => state.session);
  return (
    <section className="themes-page">
      <header className="themes-heading">
        <span className="gq-kicker">Curadoria responsável</span>
        <h1>Moderação de temas.</h1>
        <p>Revise sugestões e administre os ciclos de votação.</p>
      </header>
      {session ? (
        <ManagedThemes key={session.token} />
      ) : (
        <Card>
          <p>Entre como administrador para moderar temas.</p>
          <Button variant="secondary" onClick={onSignIn}>
            Entrar para moderar
          </Button>
        </Card>
      )}
    </section>
  );
}

function ManagedThemes() {
  const session = useAuthStore((state) => state.session);
  const client = useQueryClient();
  const [filter, setFilter] = useState<ThemeStatus | 'TODOS'>('PENDENTE');
  const [cycleName, setCycleName] = useState('');
  const [duration, setDuration] = useState(60);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingCycle, setPendingCycle] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const identity = [session?.email, session?.expiresAt];
  const themes = useQuery({
    queryKey: ['themes', 'moderation', ...identity],
    queryFn: ({ signal }) => getManagedThemes(signal),
    enabled: !!session,
    retry: false,
  });
  const cycle = useQuery({
    queryKey: ['themes', 'cycle', ...identity],
    queryFn: ({ signal }) => getCurrentCycle(signal),
    enabled: !!session,
    retry: false,
  });

  async function moderate(
    theme: Theme,
    action: 'aprovar' | 'suspender' | 'remover',
  ) {
    if (busyId) return;
    setBusyId(theme.id);
    setError('');
    setMessage('');
    try {
      const result = await moderateTheme(theme.id, action);
      setMessage(
        'Tema "' +
          result.titulo +
          '" atualizado: ' +
          labels[result.status] +
          '.',
      );
      await client.invalidateQueries({ queryKey: ['themes'] });
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 403
          ? 'Sua conta não tem permissão para moderar temas.'
          : cause instanceof Error
            ? cause.message
            : 'Não foi possível moderar o tema.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleCycle(action: 'criar' | 'encerrar') {
    if (pendingCycle) return;
    setPendingCycle(true);
    setError('');
    setMessage('');
    try {
      if (action === 'criar') {
        if (!cycleName.trim() || duration < 5 || duration > 10080) {
          setError('Informe um nome e duração entre 5 e 10080 minutos.');
          return;
        }
        const created = await createCycle(cycleName, duration);
        setMessage('Ciclo "' + created.nome + '" iniciado.');
        setCycleName('');
      } else if (cycle.data) {
        const closed = await closeCycle(cycle.data.id);
        setMessage('Ciclo "' + closed.nome + '" encerrado.');
      }
      await client.invalidateQueries({ queryKey: ['themes'] });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível administrar o ciclo.',
      );
    } finally {
      setPendingCycle(false);
    }
  }

  const visible =
    themes.data?.filter(
      (theme) => filter === 'TODOS' || theme.status === filter,
    ) ?? [];

  return (
    <>
      <p>A autorização para modificar temas e ciclos é validada no backend.</p>
      {error && <Notice message={error} />}
      {message && (
        <p role="status" className="themes-success">
          {message}
        </p>
      )}
      <div className="themes-admin-layout">
        <section aria-labelledby="themes-moderation-title">
          <h2 id="themes-moderation-title">Sugestões recebidas</h2>
          {themes.isPending ? (
            <p role="status">Carregando moderação…</p>
          ) : themes.isError ? (
            <Notice
              message={
                themes.error instanceof ApiError && themes.error.status === 403
                  ? 'Acesso restrito a administradores.'
                  : 'Não foi possível consultar as sugestões.'
              }
            />
          ) : (
            <>
              <div className="themes-filters" aria-label="Filtrar temas">
                {(
                  [
                    'PENDENTE',
                    'APROVADO',
                    'SUSPENSO',
                    'REMOVIDO',
                    'TODOS',
                  ] as const
                ).map((status) => (
                  <Button
                    key={status}
                    variant={status === filter ? 'secondary' : 'outline'}
                    aria-pressed={status === filter}
                    onClick={() => setFilter(status)}
                  >
                    {status === 'TODOS' ? 'Todos' : labels[status]}
                  </Button>
                ))}
              </div>
              {visible.length === 0 ? (
                <Card>
                  <p>Nenhum tema corresponde a este filtro.</p>
                </Card>
              ) : (
                <ul className="themes-list">
                  {visible.map((theme) => (
                    <li key={theme.id}>
                      <Card className="themes-card">
                        <span className="themes-state">
                          {labels[theme.status]}
                        </span>
                        <h3>{theme.titulo}</h3>
                        <p>{theme.descricao || 'Sem descrição.'}</p>
                        <div className="themes-actions">
                          {theme.status !== 'APROVADO' &&
                            theme.status !== 'REMOVIDO' && (
                              <Button
                                variant="secondary"
                                busy={busyId === theme.id}
                                disabled={!!busyId}
                                onClick={() => void moderate(theme, 'aprovar')}
                              >
                                Aprovar
                              </Button>
                            )}
                          {theme.status === 'APROVADO' && (
                            <Button
                              variant="outline"
                              busy={busyId === theme.id}
                              disabled={!!busyId}
                              onClick={() => void moderate(theme, 'suspender')}
                            >
                              Suspender
                            </Button>
                          )}
                          {theme.status !== 'REMOVIDO' && (
                            <Button
                              variant="outline"
                              busy={busyId === theme.id}
                              disabled={!!busyId}
                              onClick={() => void moderate(theme, 'remover')}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
        <section aria-labelledby="themes-cycle-title">
          <Card className="themes-suggest">
            <h2 id="themes-cycle-title">Ciclo de votação</h2>
            {cycle.isPending ? (
              <p role="status">Consultando ciclo…</p>
            ) : cycle.isError ? (
              <Notice message="Não foi possível consultar o ciclo." />
            ) : cycle.data ? (
              <>
                <p>
                  <strong>{cycle.data.nome}</strong> — aberto
                </p>
                <p>
                  Encerra em{' '}
                  {new Date(cycle.data.fimEm).toLocaleString('pt-BR')}.
                </p>
                <Button
                  variant="outline"
                  busy={pendingCycle}
                  onClick={() => void handleCycle('encerrar')}
                >
                  Encerrar ciclo
                </Button>
              </>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCycle('criar');
                }}
              >
                <fieldset disabled={pendingCycle} className="themes-fields">
                  <legend className="gq-sr-only">Abrir novo ciclo</legend>
                  <Input
                    label="Nome do ciclo"
                    value={cycleName}
                    onChange={(event) => setCycleName(event.target.value)}
                    maxLength={100}
                    required
                  />
                  <Input
                    label="Duração em minutos"
                    type="number"
                    min={5}
                    max={10080}
                    value={duration}
                    onChange={(event) =>
                      setDuration(Number(event.target.value))
                    }
                    required
                  />
                  <Button
                    type="submit"
                    busy={pendingCycle}
                    loadingLabel="Abrindo…"
                  >
                    Abrir ciclo
                  </Button>
                </fieldset>
              </form>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
