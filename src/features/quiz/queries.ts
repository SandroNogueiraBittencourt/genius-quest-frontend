import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { getMyMatches, getMyMatchesPage } from './api';

function useMyMatchesOptions() {
  const session = useAuthStore((state) => state.session);
  return {
    queryKey: ['quiz', 'my-matches', session?.email, session?.expiresAt],
    enabled: !!session,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  } as const;
}

export function useMyMatches() {
  return useQuery({
    ...useMyMatchesOptions(),
    queryFn: ({ signal }) => getMyMatches(signal),
  });
}

export function useMyMatchesPage(page: number) {
  const options = useMyMatchesOptions();
  return useQuery({
    ...options,
    queryKey: [...options.queryKey, page],
    queryFn: ({ signal }) => getMyMatchesPage(page, signal),
  });
}
