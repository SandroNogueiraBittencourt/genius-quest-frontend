import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import type { AuthSession } from '../auth/types';
import { getApprovedCategories, getApprovedCategoriesPage } from './api';

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

export function useApprovedCategoriesPage(page: number, size = 10) {
  const session = useAuthStore((state) => state.session);

  return useQuery({
    queryKey: [...approvedCategoriesKey(session), 'paginated', page, size],
    queryFn: ({ signal }) => getApprovedCategoriesPage(page, size, signal),
    enabled: !!session,
    retry: false,
    networkMode: 'always',
    refetchOnReconnect: false,
  });
}
