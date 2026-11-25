import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { resetDemoRooms } from '../features/demo/roomGateway';
import { useRoomStore } from '../features/room/store';
import { useAuthStore } from '../features/auth/store';
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  resetDemoRooms();
  useRoomStore.getState().leave();
  useAuthStore.setState({ session: null, notice: null });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'UP',
          application: 'Genius Quest Backend',
          timestamp: '2026-10-08',
        }),
      ),
    ),
  );
});
afterEach(() => {
  useAuthStore.setState({ session: null, notice: null });
  vi.unstubAllGlobals();
});
it('preserva a sala ao visitar a abertura e permite retomá-la', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Reunir a turma/ }));
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Como podemos chamar você?' }),
    { target: { value: 'Sandro' } },
  );
  await screen.findByRole('radio', { name: /Natureza e descobertas/ });
  fireEvent.click(
    screen.getByRole('button', { name: 'Criar sala demonstrativa' }),
  );
  const heading = await screen.findByRole('heading', {
    name: 'Um lugar para sua turma.',
  });
  expect(heading).toHaveFocus();
  expect(window.location.search).toBe('?view=lobby');
  await screen.findByText('1/20');
  fireEvent.click(screen.getByRole('link', { name: 'Início' }));
  expect(screen.getByRole('button', { name: /Reunir a turma/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Voltar para a sala' }));
  expect(await screen.findByText('1/20')).toBeInTheDocument();
});
it('mantém o catálogo acessível e permite retornar à abertura', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Design System' }));
  expect(window.location.search).toBe('?view=design-system');
  expect(
    screen.getByRole('heading', { name: 'Peças para cada descoberta' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: '← Voltar à abertura' }));
  expect(window.location.search).toBe('');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Cada pergunta,',
  );
});

it('separa o histórico de votação do histórico de placares das partidas', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Minha área' }));
  fireEvent.click(screen.getByRole('link', { name: 'Resultados' }));
  expect(window.location.search).toBe('?view=match-results');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Resultados' }),
  ).toHaveFocus();
  expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  fireEvent.click(screen.getByRole('link', { name: 'Comunidade' }));
  fireEvent.click(screen.getByRole('link', { name: 'Histórico de votação' }));
  expect(window.location.search).toBe('?view=history');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Histórico de votação.' }),
  ).toBeInTheDocument();
});

it('reconhece o acesso direto à página de resultados e oferece login', () => {
  window.history.replaceState({}, '', '/?view=match-results');
  render(<App />);
  expect(
    screen.getByRole('heading', { level: 1, name: 'Resultados' }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar para ver resultados' }),
  );
  expect(window.location.search).toBe('?view=login');
});

it('retorna à página de resultados depois de autenticar', async () => {
  window.history.replaceState({}, '', '/?view=match-results');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith('/auth/login')
              ? { token: 'sessao-de-teste', tipo: 'Bearer', expiraEm: 3600 }
              : url.endsWith('/partidas/minhas?incluirSalas=true')
                ? []
                : {
                    status: 'UP',
                    application: 'Genius Quest Backend',
                    timestamp: '2026-11-24',
                  },
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );
  render(<App />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar para ver resultados' }),
  );
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'jogador@gq.test' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'senha-de-teste' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  expect(
    await screen.findByText(
      'Você ainda não tem resultados de partidas multiplayer.',
    ),
  ).toBeInTheDocument();
  expect(window.location.search).toBe('?view=match-results');
});

it('não exibe Administração para visitantes', () => {
  render(<App />);
  const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
  expect(
    within(nav).queryByRole('link', { name: 'Administração' }),
  ).not.toBeInTheDocument();
});

it('não exibe Administração para usuário comum autenticado', () => {
  useAuthStore.setState({
    session: {
      token: `teste.${btoa(JSON.stringify({ perfil: 'USER' }))}.teste`,
      email: 'jogador@example.test',
      expiresAt: Date.now() + 3600000,
    },
  });
  render(<App />);
  const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
  expect(
    within(nav).queryByRole('link', { name: 'Administração' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
});

it('exibe as três áreas administrativas para ADMIN', async () => {
  useAuthStore.setState({
    session: {
      token: `teste.${btoa(JSON.stringify({ perfil: 'ADMIN' }))}.teste`,
      email: 'admin@example.test',
      expiresAt: Date.now() + 3600000,
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith('/health')
              ? {
                  status: 'UP',
                  application: 'Genius Quest Backend',
                  timestamp: '2026-11-25',
                }
              : [],
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Administração' }));
  const nav = screen.getByRole('navigation', { name: 'Administração' });
  expect(within(nav).getByRole('link', { name: 'Categorias' })).toHaveAttribute(
    'href',
    '/?view=categories-admin',
  );
  expect(within(nav).getByRole('link', { name: 'Temas' })).toHaveAttribute(
    'href',
    '/?view=themes-admin',
  );
  expect(within(nav).getByRole('link', { name: 'Perguntas' })).toHaveAttribute(
    'href',
    '/?view=questions-admin',
  );
  await screen.findByRole('heading', { name: 'Moderação de categorias.' });
});

it('usa URLs de raiz na página de redefinição de senha', () => {
  window.history.replaceState({}, '', '/redefinir-senha');
  render(<App />);
  const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
  expect(within(nav).getByRole('link', { name: 'Início' })).toHaveAttribute(
    'href',
    '/',
  );
  expect(within(nav).getByRole('link', { name: 'Jogar' })).toHaveAttribute(
    'href',
    '/?view=real-room',
  );
  expect(within(nav).getByRole('link', { name: 'Comunidade' })).toHaveAttribute(
    'href',
    '/?view=categories',
  );
  expect(within(nav).getByRole('link', { name: 'Minha área' })).toHaveAttribute(
    'href',
    '/?view=quiz',
  );
  expect(
    screen.getByRole('link', { name: 'Genius Quest, início' }),
  ).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: /^Entrar$/ })).toHaveAttribute(
    'href',
    '/?view=login',
  );
  expect(screen.getByRole('link', { name: /^Criar conta$/ })).toHaveAttribute(
    'href',
    '/?view=register',
  );
  expect(screen.getByRole('link', { name: 'Design System' })).toHaveAttribute(
    'href',
    '/?view=design-system',
  );
  fireEvent.click(within(nav).getByRole('link', { name: 'Início' }));
  expect(window.location.pathname).toBe('/');
  expect(window.location.search).toBe('');
});

it('distingue a seção ativa da página ativa', () => {
  window.history.replaceState({}, '', '/?view=match-results');
  render(<App />);
  expect(screen.getByRole('link', { name: 'Minha área' })).toHaveAttribute(
    'aria-current',
    'location',
  );
  expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  fireEvent.click(screen.getByRole('link', { name: 'Comunidade' }));
  expect(screen.getByRole('link', { name: 'Comunidade' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  fireEvent.click(screen.getByRole('link', { name: 'Histórico de votação' }));
  expect(screen.getByRole('link', { name: 'Comunidade' })).toHaveAttribute(
    'aria-current',
    'location',
  );
  expect(
    screen.getByRole('link', { name: 'Histórico de votação' }),
  ).toHaveAttribute('aria-current', 'page');
});

it('acompanha o histórico ao voltar e avançar entre seções', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('link', { name: 'Comunidade' }));
  fireEvent.click(screen.getByRole('link', { name: 'Minha área' }));
  expect(window.location.search).toBe('?view=quiz');
  window.history.back();
  await waitFor(() => {
    expect(window.location.search).toBe('?view=categories');
    expect(screen.getByRole('link', { name: 'Comunidade' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
  window.history.forward();
  await waitFor(() => {
    expect(window.location.search).toBe('?view=quiz');
    expect(screen.getByRole('link', { name: 'Minha área' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

it('preserva convite durante login e retorna ao multiplayer', async () => {
  const code = '33333333-0000-4000-8000-000000000001';
  window.history.replaceState({}, '', `/?view=real-room&room=${code}`);
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.endsWith('/auth/login')
              ? { token: 'sessao-de-teste', tipo: 'Bearer', expiraEm: 3600 }
              : url.endsWith('/temas')
                ? []
                : { status: 'UP' },
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Entrar para jogar' }));
  expect(new URLSearchParams(window.location.search).get('room')).toBe(code);
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: 'jogador@gq.test' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'senha-de-teste' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );
  expect(
    await screen.findByRole('textbox', { name: 'Código completo (UUID)' }),
  ).toHaveValue(code);
  expect(new URLSearchParams(window.location.search).get('view')).toBe(
    'real-room',
  );
});
