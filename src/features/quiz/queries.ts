import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { getMyMatches } from './api';

export function useMyMatches() {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: ['quiz', 'my-matches', session?.email, session?.expiresAt],
    queryFn: ({ signal }) => getMyMatches(signal),
    enabled: !!session,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}
