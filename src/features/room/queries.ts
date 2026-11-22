import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { getRoom } from './api';

export function useOnlineRoom(code: string | undefined) {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: ['room', session?.email, session?.expiresAt, code],
    queryFn: ({ signal }) => {
      if (!code) throw new Error('Entre em uma sala para continuar.');
      return getRoom(code, signal);
    },
    enabled: !!session && !!code,
    retry: false,
    refetchInterval: 3000,
  });
}
