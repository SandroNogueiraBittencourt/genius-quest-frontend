import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../App';
import { rememberRoomCode } from '../room/savedRoom';
import { readSessionUser, rememberSessionUser } from './sessionResume';
import { useAuthStore } from './store';

const usuarioId = '60b23d15-7c6b-4f92-b882-7b9615f1c6b3';
const codigo = '6ad4a771-b68f-4cb1-a279-61fb61ab5704';
const partidaId = '6ad4a771-b68f-4cb1-a279-61fb61ab5705';
const jwt = (id: string) =>
  'header.' + btoa(JSON.stringify({ usuarioId: id })) + '.assinatura';
const token = jwt(usuarioId);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  sessionStorage.clear();
  rememberSessionUser(token);
  rememberRoomCode(usuarioId, codigo);
  window.history.replaceState(null, '', '/?view=real-room');
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  useAuthStore.setState({ session: null, notice: null });
  window.history.replaceState(null, '', '/');
});

it.each([false, true])(
  'restaura a mesma sala e consulta o progresso do jogador (terminou: %s)',
  async (terminou) => {
    let responder!: (response: Response) => void;
    const restore = new Promise<Response>((resolve) => {
      responder = resolve;
    });
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/sessao')) return restore;
      if (url.endsWith('/api/salas/' + codigo))
        return json({
          codigo,
          partidaId,
          anfitriaoId: '60b23d15-7c6b-4f92-b882-7b9615f1c6b4',
          temaId: 'tema-1',
          status: 'EM_ANDAMENTO',
          participantes: [{ id: usuarioId, nome: 'Convidado' }],
          encerrada: false,
        });
      if (url.endsWith('/partida/pergunta-atual'))
        return terminou
          ? new Response(null, { status: 204 })
          : json({
              partidaId,
              numero: 4,
              totalPerguntas: 10,
              enunciado: 'Pergunta retomada',
              alternativas: ['A', 'B', 'C', 'D'],
            });
      if (url.endsWith('/temas')) return json([]);
      return json({ status: 'UP', application: 'Genius Quest' });
    });
    vi.stubGlobal('fetch', fetch);
    render(<App />);

    expect(screen.getByText('Restaurando sua sessão…')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Entrar para jogar' }),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/sessao',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: '{}',
      }),
    );
    responder(
      json({
        token,
        tipo: 'Bearer',
        expiraEm: 60,
        email: 'jogador@exemplo.test',
      }),
    );

    expect(
      await screen.findByText(
        terminou
          ? /Aguardando os outros jogadores para ver o resultado/
          : 'Pergunta retomada',
      ),
    ).toBeInTheDocument();
    if (!terminou)
      expect(screen.getByText('Pergunta 4 de 10')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/salas/' + codigo,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer ' + token }),
      }),
    );
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/entrada'))).toBe(
      false,
    );
    expect(Object.values(sessionStorage)).not.toContain(token);
  },
);

it.each([401, 200])(
  'exige login se a sessão foi invalidada ou pertencer a outra conta (%s)',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(
          {
            token: jwt('60b23d15-7c6b-4f92-b882-7b9615f1c6b4'),
            tipo: 'Bearer',
            expiraEm: 60,
            email: 'outra@exemplo.test',
          },
          status,
        ),
      ),
    );
    render(<App />);

    expect(
      await screen.findByRole('button', { name: 'Entrar para jogar' }),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().session).toBeNull();
    expect(readSessionUser()).toBeNull();
  },
);

it('permite tentar novamente quando a API de sessão está temporariamente indisponível', async () => {
  let consultas = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/auth/sessao')) {
        return ++consultas === 1 ? json({}, 503) : json({}, 401);
      }
      return json({ status: 'UP', application: 'Genius Quest' });
    }),
  );
  render(<App />);

  expect(
    await screen.findByText(
      'Não foi possível verificar sua sessão. Tente novamente.',
    ),
  ).toBeInTheDocument();
  expect(readSessionUser()).toBe(usuarioId);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(
    await screen.findByRole('button', { name: 'Entrar para jogar' }),
  ).toBeInTheDocument();
  expect(consultas).toBe(2);
});
