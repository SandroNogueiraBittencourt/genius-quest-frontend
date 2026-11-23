import { useCallback, useEffect, useState } from 'react';
export type View =
  | 'home'
  | 'lobby'
  | 'real-room'
  | 'design-system'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'categories'
  | 'categories-admin'
  | 'questions-admin'
  | 'themes'
  | 'themes-admin'
  | 'history'
  | 'quiz';
function currentView(): View {
  if (window.location.pathname === '/redefinir-senha') return 'reset-password';
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'lobby' ||
    view === 'real-room' ||
    view === 'design-system' ||
    view === 'login' ||
    view === 'register' ||
    view === 'forgot-password' ||
    view === 'reset-password' ||
    view === 'categories' ||
    view === 'categories-admin' ||
    view === 'questions-admin' ||
    view === 'themes' ||
    view === 'themes-admin' ||
    view === 'history' ||
    view === 'quiz'
    ? view
    : 'home';
}
export function useNavigation() {
  const [view, setView] = useState(currentView);
  useEffect(() => {
    const update = () => setView(currentView());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  const navigate = useCallback((next: View) => {
    const url = new URL(window.location.href);
    url.hash = '';
    url.pathname = next === 'reset-password' ? '/redefinir-senha' : '/';
    if (next !== 'reset-password') url.searchParams.delete('token');
    if (next === 'home') url.searchParams.delete('view');
    else url.searchParams.set('view', next);
    window.history.pushState({}, '', url);
    setView(next);
  }, []);
  return { view, navigate };
}
