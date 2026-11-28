import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useNavigation } from './navigation';

const room = '33333333-0000-4000-8000-000000000001';

afterEach(() => window.history.replaceState(null, '', '/'));

it('preserva o convite no login e o remove quando o jogador navega para resultados', () => {
  window.history.replaceState(null, '', `/?view=real-room&room=${room}`);
  const { result } = renderHook(useNavigation);

  act(() => result.current.navigate('login'));
  expect(result.current.view).toBe('login');
  expect(new URLSearchParams(window.location.search).get('room')).toBe(room);

  act(() => result.current.navigate('match-results'));
  expect(result.current.view).toBe('match-results');
  expect(window.location.search).toBe('?view=match-results');
});

it('atualiza a tela ao restaurar uma URL pelo histórico do navegador', () => {
  const { result } = renderHook(useNavigation);
  expect(result.current.view).toBe('home');

  act(() => {
    window.history.replaceState(null, '', '/redefinir-senha?view=login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(result.current.view).toBe('reset-password');

  act(() => {
    window.history.replaceState(null, '', '/?view=desconhecida');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(result.current.view).toBe('home');
});

it.each([
  'login',
  'register',
  'verify-email',
  'forgot-password',
  'real-room',
] as const)(
  'preserva o convite e remove o token de recuperação ao navegar para %s',
  (destino) => {
    window.history.replaceState(
      null,
      '',
      `/redefinir-senha?token=teste&room=${room}#secao`,
    );
    const { result } = renderHook(useNavigation);
    act(() => result.current.navigate(destino));
    const parametros = new URLSearchParams(window.location.search);
    expect(result.current.view).toBe(destino);
    expect(window.location.pathname).toBe('/');
    expect(window.location.hash).toBe('');
    expect(parametros.get('room')).toBe(room);
    expect(parametros.has('token')).toBe(false);
  },
);

it('mantém o código na redefinição e volta à URL inicial ao sair', () => {
  window.history.replaceState(
    null,
    '',
    `/?view=login&token=teste&room=${room}`,
  );
  const { result } = renderHook(useNavigation);
  act(() => result.current.navigate('reset-password'));
  expect(window.location.pathname).toBe('/redefinir-senha');
  expect(new URLSearchParams(window.location.search).get('token')).toBe(
    'teste',
  );
  act(() => result.current.navigate('home'));
  expect(window.location.pathname).toBe('/');
  expect(window.location.search).toBe('');
});
