import { useCallback, useEffect, useState } from 'react';
export type View = 'home' | 'lobby' | 'design-system';
function currentView(): View {
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'lobby' || view === 'design-system' ? view : 'home';
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
    if (next === 'home') url.searchParams.delete('view');
    else url.searchParams.set('view', next);
    window.history.pushState({}, '', url);
    setView(next);
  }, []);
  return { view, navigate };
}
