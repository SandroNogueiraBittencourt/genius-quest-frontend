import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import type { AuthSession } from '../auth/types';
import { getApprovedCategories } from './api';

export const approvedCategoriesKey = (session: AuthSession | null) =>
  ['categories', 'approved', session?.email, session?.expiresAt] as const;

export function useApprovedCategories() {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: approvedCategoriesKey(session),
    queryFn: ({ signal }) => getApprovedCategories(signal),
    enabled: !!session,
    retry: false,
    networkMode: 'always',
    refetchOnReconnect: false,
  });
}
